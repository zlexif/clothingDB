import { describe, expect, it } from 'vitest';
import { groupProblems, loadClothing, MAX_FILES } from './custom-clothing';

describe('loadClothing', () => {
  it('reads at most 200 clothing files per drop and says how many were left out', async () => {
    const files = Array.from(
      { length: MAX_FILES + 5 },
      (_, i) => new File(['this is not a gta game file'], `jbib_${i}_u.ydd`),
    );
    const { items, problems } = await loadClothing(files, 'male');
    expect(items).toHaveLength(0);
    expect(problems[0]).toMatchObject({ file: '5 more files' });
    expect(problems.filter((p) => p.message.startsWith('This is not a GTA V'))).toHaveLength(MAX_FILES);
  });

  it('turns away files over 64 MB before reading them', async () => {
    const big = new File([new Uint8Array(64 * 1024 * 1024 + 1)], 'jbib_000_u.ydd');
    const { problems } = await loadClothing([big], 'male');
    expect(problems).toEqual([{ file: 'jbib_000_u.ydd', message: 'This file is too large to open.' }]);
  });

  it('groups files that have the same problem', () => {
    const groups = groupProblems([
      { file: 'a.ydd', message: 'Not GTA.' },
      { file: 'b.ytd', message: 'Escrowed.' },
      { file: 'c.ydd', message: 'Not GTA.' },
    ]);
    expect(groups).toEqual([
      { message: 'Not GTA.', files: ['a.ydd', 'c.ydd'] },
      { message: 'Escrowed.', files: ['b.ytd'] },
    ]);
  });
});
