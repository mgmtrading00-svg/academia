import type { AgentDef, AgentStatus } from '@/lib/agents';

export default function Avatar({ agent, status }: { agent: AgentDef; status: AgentStatus }) {
  return (
    <span className="avatar" style={{ background: agent.color }} aria-hidden="true">
      {agent.name.slice(0, 2).toUpperCase()}
      <span className={`dot ${status}`} />
    </span>
  );
}
