import { TrendingDown, Clock } from "lucide-react";
import type { Suggestion } from "@/types/index";

interface SuggestionListProps {
  suggestions: Suggestion[];
}

export function SuggestionList({ suggestions }: SuggestionListProps) {
  return (
    <ul className="space-y-2">
      {suggestions.map((suggestion, index) => (
        <li key={index} className="flex items-start gap-2 text-sm">
          {suggestion.type === "drop_off" ? (
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span>{suggestion.message}</span>
        </li>
      ))}
    </ul>
  );
}
