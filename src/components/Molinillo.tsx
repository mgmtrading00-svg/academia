/**
 * El molinillo de Moral Agency AI: cuatro esquinas de visor alrededor de un punto dorado.
 * Con `spin`, las esquinas giran: es la señal de que un empleado está trabajando.
 */
export default function Molinillo({ size = 28, spin = false, title }: { size?: number; spin?: boolean; title?: string }) {
  return (
    <svg className={`molinillo${spin ? ' spin' : ''}`} viewBox="0 0 200 200" width={size} height={size} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <g className="mol-esquinas">
        {[0, 90, 180, 270].map((r) => (
          <path key={r} d="M86,26 L136,26 L136,76" transform={`rotate(${r} 100 100)`} fill="none" stroke="currentColor" strokeWidth={17} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
      <circle className="mol-punto" cx="100" cy="100" r="17" />
    </svg>
  );
}
