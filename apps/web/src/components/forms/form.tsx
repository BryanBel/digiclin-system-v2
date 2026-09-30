import { useId, useState, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { errorMessage, type ErrorLike } from '@/lib/errors';

/** Campo con etiqueta, ayuda y error asociados por aria (lectores de pantalla incluidos). */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: {
    id: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex gap-2">
      <Input {...props} type={visible ? 'text' : 'password'} className="flex-1" />
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => setVisible((v) => !v)}
        aria-pressed={visible}
      >
        {visible ? 'Ocultar' : 'Mostrar'}
      </Button>
    </div>
  );
}

export function FormAlert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'ok';
  children: ReactNode;
}) {
  return (
    <Alert
      variant={tone === 'error' ? 'destructive' : 'default'}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? 'Un momento…' : children}
    </Button>
  );
}

/** Error listo para mostrar al usuario (ya traducido). */
export class UserFacingError extends Error {}

/** Resultado de Better Auth ({ data, error }): lanza el error ya traducido. */
export async function authCall<T>(
  promise: Promise<{ data: T; error: null } | { data: null; error: ErrorLike }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new UserFacingError(errorMessage(error));
  return data as T;
}

/** Resultado de la API (openapi-fetch): lanza el mensaje de la API o uno generico. */
export async function apiCall<T>(
  promise: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await promise;
  if (!response.ok) {
    const message = (error as { message?: string } | undefined)?.message;
    throw new UserFacingError(errorMessage({ message, status: response.status }));
  }
  return data as T;
}

/** Estado de un envio: pendiente y error, con el error ya traducido. */
export function useAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof UserFacingError ? caught.message : errorMessage(null));
      if (!(caught instanceof UserFacingError)) console.error(caught);
    } finally {
      setPending(false);
    }
  };

  return { pending, error, setError, run };
}

/** Lee un campo de texto de un formulario. */
export const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
