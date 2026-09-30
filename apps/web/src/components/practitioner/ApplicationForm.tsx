import type { PractitionerProfile, Qualification } from '@digiclin/shared';
import { practitionerApplicationBody } from '@digiclin/shared';
import { useState } from 'react';
import { browserApi } from '@/lib/api';
import { apiCall, Field, FormAlert, SubmitButton, useAction } from '@/components/forms/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Registros sugeridos para Venezuela (lo habitual en el recipe). Son solo sugerencias: el tipo
 * es texto libre para que sirva en otros paises. Validar con la clinica cuales exige.
 */
const SUGGESTED_TYPES = ['MPPS', 'Colegio de Médicos'];

type Row = { type: string; number: string; issuer: string; country: string };

const toRow = (q?: Partial<Qualification>): Row => ({
  type: q?.type ?? '',
  number: q?.number ?? '',
  issuer: q?.issuer ?? '',
  country: q?.country ?? 'VE',
});

export function ApplicationForm({ initial }: { initial?: PractitionerProfile | null }) {
  const { pending, error, setError, run } = useAction();
  const [specialties, setSpecialties] = useState(initial?.specialties.join(', ') ?? '');
  const [rows, setRows] = useState<Row[]>(
    initial?.qualifications.length
      ? initial.qualifications.map(toRow)
      : SUGGESTED_TYPES.map((type) => toRow({ type })),
  );

  const update = (index: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = {
      specialties: specialties
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      // Filas vacias se ignoran: no todos tienen todos los registros sugeridos.
      qualifications: rows
        .filter((row) => row.type.trim() || row.number.trim())
        .map((row) => ({
          type: row.type,
          number: row.number,
          country: row.country,
          ...(row.issuer.trim() ? { issuer: row.issuer } : {}),
        })),
    };

    const parsed = practitionerApplicationBody.safeParse(body);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Revisa los datos.');

    return run(async () => {
      await apiCall(browserApi.PUT('/api/practitioners/me/application', { body }));
      window.location.reload();
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6" noValidate>
      <Field
        label="Especialidades"
        hint="Separadas por coma, p. ej. Medicina Interna, Cardiología. Máximo 5."
      >
        {(props) => (
          <Input
            {...props}
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            required
          />
        )}
      </Field>

      <fieldset className="grid gap-4">
        <legend className="font-medium">Registros profesionales</legend>
        <p className="-mt-2 text-sm text-muted-foreground">
          Tal como aparecen en tus documentos. La clínica los verifica antes de aprobarte.
        </p>
        {rows.map((row, index) => (
          <div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
            <Field label="Tipo de registro">
              {(props) => (
                <Input
                  {...props}
                  list="qualification-types"
                  value={row.type}
                  onChange={(e) => update(index, { type: e.target.value })}
                />
              )}
            </Field>
            <Field label="Número">
              {(props) => (
                <Input
                  {...props}
                  value={row.number}
                  onChange={(e) => update(index, { number: e.target.value })}
                />
              )}
            </Field>
            <Field
              label="Entidad emisora (opcional)"
              hint="P. ej. Colegio de Médicos del Distrito Capital"
            >
              {(props) => (
                <Input
                  {...props}
                  value={row.issuer}
                  onChange={(e) => update(index, { issuer: e.target.value })}
                />
              )}
            </Field>
            <Field label="País" hint="Código de 2 letras (VE, CO, ES…)">
              {(props) => (
                <Input
                  {...props}
                  value={row.country}
                  maxLength={2}
                  onChange={(e) => update(index, { country: e.target.value.toUpperCase() })}
                />
              )}
            </Field>
            {rows.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                className="justify-self-start"
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
              >
                Quitar este registro
              </Button>
            )}
          </div>
        ))}
        <datalist id="qualification-types">
          {SUGGESTED_TYPES.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>
        {rows.length < 5 && (
          <Button
            type="button"
            variant="outline"
            className="justify-self-start"
            onClick={() => setRows((current) => [...current, toRow()])}
          >
            Agregar otro registro
          </Button>
        )}
      </fieldset>

      {error && <FormAlert>{error}</FormAlert>}
      <SubmitButton pending={pending}>Enviar solicitud</SubmitButton>
    </form>
  );
}
