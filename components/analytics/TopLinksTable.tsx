import type { TopLink } from "@/types/index";

interface TopLinksTableProps {
  links: TopLink[];
  onLinkClick: (link: TopLink) => void;
}

export function TopLinksTable({ links, onLinkClick }: TopLinksTableProps) {
  if (links.length === 0) {
    return <p className="text-muted-foreground">Nenhum link ainda.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 font-medium">Link</th>
          <th className="py-2 text-right font-medium">Visualizações</th>
        </tr>
      </thead>
      <tbody>
        {links.map((link) => (
          <tr
            key={link.link_id}
            className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
            onClick={() => onLinkClick(link)}
          >
            <td className="py-2">{link.label ?? "Sem rótulo"}</td>
            <td className="py-2 text-right tabular-nums">{link.total_views}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
