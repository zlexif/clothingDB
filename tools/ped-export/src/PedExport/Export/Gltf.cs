using System.Numerics;
using CodeWalker.GameFiles;
using CodeWalker.Utils;
using SharpGLTF.Geometry;
using SharpGLTF.Geometry.VertexTypes;
using SharpGLTF.Materials;
using SharpGLTF.Scenes;
using SharpGLTF.Transforms;
using DX = SharpDX;
using VERTEX = SharpGLTF.Geometry.VertexBuilder<
    SharpGLTF.Geometry.VertexTypes.VertexPositionNormal,
    SharpGLTF.Geometry.VertexTypes.VertexTexture1,
    SharpGLTF.Geometry.VertexTypes.VertexJoints4>;

namespace PedExport.Export;

public static class Gltf
{
    private const int Position = 0, BlendWeights = 1, BlendIndices = 2, Normal = 3, TexCoord0 = 6;

    private static Vector3 Up(DX.Vector3 v) => new(v.X, v.Z, -v.Y);
    private static Quaternion Up(DX.Quaternion q) => new(q.X, q.Z, -q.Y, q.W);

    public static NodeBuilder[] BuildSkeleton(Skeleton skeleton, out NodeBuilder root)
    {
        ArgumentNullException.ThrowIfNull(skeleton);
        var bones = skeleton.Bones.Items;
        var nodes = new NodeBuilder[bones.Length];
        root = new NodeBuilder("ped");
        for (int i = 0; i < bones.Length; i++)
        {
            var b = bones[i];
            var parent = b.ParentIndex >= 0 && b.ParentIndex < i ? nodes[b.ParentIndex] : root;
            var n = parent.CreateNode(b.Name);
            var s = b.Scale;
            n.LocalTransform = new AffineTransform(new Vector3(s.X, s.Z, s.Y), Up(b.Rotation), Up(b.Translation));
            nodes[i] = n;
        }
        return nodes;
    }

    public static void WriteSkeleton(Skeleton skeleton, string path)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        BuildSkeleton(skeleton, out var root);
        var scene = new SceneBuilder();
        scene.AddNode(root);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        scene.ToGltf2().SaveGLB(path);
    }

    public static bool WriteDrawable(Drawable drawable, Skeleton skeleton, string name, string path, int attachBone = -1)
    {
        ArgumentNullException.ThrowIfNull(drawable);
        ArgumentNullException.ThrowIfNull(skeleton);
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        var lods = drawable.DrawableModels;
        var models = new[] { lods?.High, lods?.Med, lods?.Low, lods?.VLow }
            .FirstOrDefault(m => m != null && m.Length > 0 && m.Any(x => x.Geometries?.Length > 0));
        if (models == null) return false;

        var joints = BuildSkeleton(skeleton, out _);
        var attach = attachBone >= 0 ? joints[attachBone].WorldMatrix : Matrix4x4.Identity;
        var mesh = new MeshBuilder<VertexPositionNormal, VertexTexture1, VertexJoints4>(name);
        var material = new MaterialBuilder(name).WithDoubleSide(false).WithMetallicRoughnessShader();
        var prim = mesh.UsePrimitive(material);
        int tris = 0;

        foreach (var model in models)
        {
            foreach (var g in model.Geometries ?? Array.Empty<DrawableGeometry>())
            {
                var vd = g.VertexData;
                var idx = g.IndexBuffer?.Indices;
                if (vd == null || idx == null || vd.VertexCount <= 4) continue;
                var flags = vd.Info.Flags;
                bool Has(int s) => ((flags >> s) & 1) != 0;

                var verts = new VERTEX[vd.VertexCount];
                for (int v = 0; v < vd.VertexCount; v++)
                {
                    var pos = Up(vd.GetVector3(v, Position));
                    var nrm = Has(Normal) ? Vector3.Normalize(Up(vd.GetVector3(v, Normal))) : Vector3.UnitY;
                    if (attachBone >= 0)
                    {
                        pos = Vector3.Transform(pos, attach);
                        nrm = Vector3.Normalize(Vector3.TransformNormal(nrm, attach));
                    }
                    var uv = Vector2.Zero;
                    if (Has(TexCoord0))
                    {
                        var t = vd.Info.GetComponentType(TexCoord0);
                        if (t == VertexComponentType.Half2) { var h = vd.GetHalf2(v, TexCoord0); uv = new Vector2(h.X, h.Y); }
                        else { var f = vd.GetVector2(v, TexCoord0); uv = new Vector2(f.X, f.Y); }
                    }

                    VertexJoints4 skin;
                    if (attachBone >= 0)
                    {
                        skin = new VertexJoints4((attachBone, 1f));
                    }
                    else if (Has(BlendWeights) && Has(BlendIndices))
                    {
                        var w = vd.GetUByte4(v, BlendWeights);
                        var j = vd.GetUByte4(v, BlendIndices);
                        int Map(byte p) => g.BoneIds != null && p < g.BoneIds.Length ? g.BoneIds[p] : p;
                        skin = new VertexJoints4(
                            (Map(j.R), w.R / 255f), (Map(j.G), w.G / 255f),
                            (Map(j.B), w.B / 255f), (Map(j.A), w.A / 255f));
                    }
                    else
                    {
                        skin = new VertexJoints4((model.BoneIndex, 1f));
                    }
                    verts[v] = new VERTEX(new VertexPositionNormal(pos, nrm), new VertexTexture1(uv), skin);
                }

                for (int i = 0; i + 2 < idx.Length; i += 3)
                {
                    prim.AddTriangle(verts[idx[i]], verts[idx[i + 1]], verts[idx[i + 2]]);
                    tris++;
                }
            }
        }
        if (tris == 0) return false;

        var scene = new SceneBuilder();
        scene.AddSkinnedMesh(mesh, Matrix4x4.Identity, joints);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        scene.ToGltf2().SaveGLB(path);
        return true;
    }

    public static bool WriteTexture(Texture texture, string path)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        if (texture == null) return false;
        var px = DDSIO.GetPixels(texture, 0);
        if (px == null || px.Length < texture.Width * texture.Height * 4) return false;
        for (int i = 0; i < px.Length; i += 4) (px[i], px[i + 2]) = (px[i + 2], px[i]);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        Png.Write(path, texture.Width, texture.Height, px);
        return true;
    }
}
