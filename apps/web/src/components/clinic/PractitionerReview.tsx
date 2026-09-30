import { rejectPractitionerBody } from '@digiclin/shared';
import { useState } from 'react';
import { browserApi } from '@/lib/api';
import { apiCall, Field, FormAlert, SubmitButton, useAction } from '@/components/forms/form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export function PractitionerReview({ userId, name }: { userId: string; name: string }) {
  const { pending, error, setError, run } = useAction();
  const [open, setOpen] = useState(false);

  const approve = () => {
    if (!window.confirm(`¿Aprobar a ${name} como médico de la clínica? Podrá atender pacientes.`))
      return;
    return run(async () => {
      await apiCall(
        browserApi.POST('/api/clinic/practitioners/{userId}/approve', {
          params: { path: { userId } },
        }),
      );
      window.location.reload();
    });
  };

  const reject = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = rejectPractitionerBody.safeParse({
      reason: new FormData(event.currentTarget).get('reason'),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Explica el motivo.');

    return run(async () => {
      await apiCall(
        browserApi.POST('/api/clinic/practitioners/{userId}/reject', {
          params: { path: { userId } },
          body: parsed.data,
        }),
      );
      window.location.reload();
    });
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={approve} disabled={pending}>
          Aprobar
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={pending}>
              Rechazar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rechazar la solicitud de {name}</DialogTitle>
              <DialogDescription>
                El motivo le llega por correo. Podrá corregir sus datos y volver a enviarla.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={reject} className="grid gap-4" noValidate>
              <Field label="Motivo">
                {(props) => <Textarea {...props} name="reason" rows={4} required minLength={10} />}
              </Field>
              {error && <FormAlert>{error}</FormAlert>}
              <SubmitButton pending={pending}>Rechazar solicitud</SubmitButton>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {error && !open && <FormAlert>{error}</FormAlert>}
    </div>
  );
}
