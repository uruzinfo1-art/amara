import { X, Home, Sprout, RefreshCw } from "lucide-react";
import { Button } from "./ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  
}

export default function TutorialSelector({
  open,
  onClose,
  
}: Props) {

  if (!open) return null;
    return (
<div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-5">

<div className="bg-[#0b0f11] rounded-3xl border border-[#00E676]/20 max-w-lg w-full">

<div className="flex items-center justify-between p-6 border-b border-white/10">

<h2 className="text-2xl font-black text-white">
Selecciona un tutorial
</h2>

<button onClick={onClose}>
<X className="text-white"/>
</button>

</div>

<div className="p-6 space-y-5">

  <div className="rounded-2xl bg-[#11181b] p-5 border border-[#00E676]/20">

    <div className="flex items-center gap-3 mb-2">
      <Home className="text-[#00E676]" />

      <h3 className="text-white font-bold">
        Hogar
      </h3>
    </div>

    <p className="text-sm text-neutral-400 mb-4">
      Aprende a administrar tus ingresos,
      gastos, ahorros y bolsillos.
    </p>

    <Button
      className="w-full"
      onClick={() => {
  window.location.hash = "/tutorial?type=home";
}}
    >
      Abrir tutorial
    </Button>

  </div>
  <div className="rounded-2xl bg-[#11181b] p-5 border border-[#00E676]/20">

  <div className="flex items-center gap-3 mb-2">

    <Sprout className="text-[#00E676]" />

    <h3 className="text-white font-bold">
      Negocio Productivo
    </h3>

  </div>

  <p className="text-sm text-neutral-400 mb-4">
    Ideal para agricultura, ganadería, cultivos y proyectos donde primero se invierte y luego se recupera el capital.
  </p>

  <Button
    className="w-full"
   onClick={() => {
  window.location.hash = "/tutorial?type=productivo";
}}
  >
    Abrir tutorial
  </Button>

</div>
<div className="rounded-2xl bg-[#11181b] p-5 border border-[#00E676]/20">

  <div className="flex items-center gap-3 mb-2">

    <RefreshCw className="text-[#00E676]" />

    <h3 className="text-white font-bold">
      Negocio de Flujo Continuo
    </h3>

  </div>

  <p className="text-sm text-neutral-400 mb-4">
    Para tiendas, restaurantes, impresión 3D, cafeterías, servicios y cualquier negocio con ingresos diarios.
  </p>

  <Button
    className="w-full"
    onClick={() => {
  window.location.hash = "/tutorial?type=continuo";
}}
  >
    Abrir tutorial
  </Button>

</div>
<Button
  variant="outline"
  className="w-full"
  onClick={onClose}
>
  Cancelar
</Button>
 </div>   

    </div>     

</div>        
    );
}
