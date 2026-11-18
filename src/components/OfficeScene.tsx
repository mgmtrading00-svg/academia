'use client';
import { useMemo } from 'react';
import type { AgentId, AgentState } from '@/lib/agents';
import { officeSvg } from '@/lib/office-svg';

interface Props {
  states: AgentState[];
  id: string;
  selected?: AgentId | null;
  onSelect?: (id: AgentId) => void;
}

export default function OfficeScene({ states, id, selected = null, onSelect }: Props) {
  const html = useMemo(() => officeSvg(states, { interactive: !!onSelect, selected, id }), [states, selected, id, onSelect]);
  const pick = (target: EventTarget | null) => {
    const el = (target as Element | null)?.closest?.('[data-a]');
    if (el && onSelect) onSelect(el.getAttribute('data-a') as AgentId);
  };
  return (
    <div className="stage">
      <div
        className="stage-scroll"
        onClick={(e) => pick(e.target)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pick(e.target);
          }
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
