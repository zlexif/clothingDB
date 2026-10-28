import { CATEGORIES, type ItemType } from '../../lib/clothing';
import { DRAWABLE_INDEX } from '../../lib/site-data';

const GROUP: Record<ItemType, string> = {
  component: 'Clothing',
  prop: 'Props',
  overlay: 'Face and body',
};

export function SlotTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Slot</th>
          <th>Address</th>
          <th>Group</th>
          <th>Male</th>
          <th>Female</th>
        </tr>
      </thead>
      <tbody>
        {CATEGORIES.map((c) => (
          <tr key={c.slug}>
            <td>
              <a href={`/browse/${c.slug}`}>{c.label}</a>
            </td>
            <td>
              <code>{c.slug}</code>
            </td>
            <td>{GROUP[c.type]}</td>
            <td>{DRAWABLE_INDEX.male[c.slug]?.length ?? 0}</td>
            <td>{DRAWABLE_INDEX.female[c.slug]?.length ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
