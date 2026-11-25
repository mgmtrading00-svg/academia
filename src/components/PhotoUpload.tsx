'use client';
import { useActionState, useRef, useState } from 'react';
import { uploadPhotos, type FormState } from '@/app/actions';

export default function PhotoUpload() {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await uploadPhotos(prev, fd);
    if (r.ok) { formRef.current?.reset(); setNames([]); }
    return r;
  }, {});
  const [names, setNames] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form ref={formRef} action={action} style={{ display: 'grid', gap: 18 }}>
      <label
        className={`drop${over ? ' over' : ''}`}
        htmlFor="files"
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setOver(false);
          if (inputRef.current && e.dataTransfer.files.length) {
            inputRef.current.files = e.dataTransfer.files;
            setNames([...e.dataTransfer.files].map((f) => f.name));
          }
        }}
      >
        <b style={{ fontSize: 18 }}>{names.length ? `${names.length} foto${names.length > 1 ? 's' : ''} elegida${names.length > 1 ? 's' : ''}` : 'Arrastra fotos aquí o pulsa para elegirlas'}</b>
        <span className="muted small">{names.length ? names.slice(0, 4).join(', ') + (names.length > 4 ? '…' : '') : 'JPG o PNG, hasta 20 a la vez y 10 MB cada una.'}</span>
        <input ref={inputRef} id="files" name="files" type="file" accept="image/*" multiple hidden onChange={(e) => setNames([...(e.target.files ?? [])].map((f) => f.name))} />
      </label>
      <label htmlFor="note">Qué es, precio y tallas (opcional)
        <input id="note" name="note" placeholder="Pelele de cuadros · 26 € · 6, 12 y 18 meses" maxLength={300} />
        <span className="muted small">Con el precio, Teo te hace también el post para Instagram. Para una oferta escribe los dos precios: «antes 26 € ahora 20 €».</span>
      </label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="submit" disabled={pending || !names.length}>{pending ? 'Subiendo…' : 'Enviar a Teo'}</button>
        {state.ok && <span className="okmsg" role="status">{state.ok}</span>}
        {state.error && <span className="err" role="alert">{state.error}</span>}
      </div>
    </form>
  );
}
