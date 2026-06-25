import React from "react";

type Props = {
  onSelect: (tipo: string) => void;
};

export default function CreateProfileModal({ onSelect }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-card border border-white/10 rounded-3xl p-6 w-full max-w-lg">

        <h2 className="text-2xl font-bold mb-2">
          Crear nuevo perfil
        </h2>

        <p className="text-muted-foreground mb-6">
          Selecciona el tipo de perfil que deseas crear.
        </p>

        <div className="space-y-4">

          {/* Hogar */}
          <button
            onClick={() => onSelect("home")}
            className="w-full text-left border border-primary/20 rounded-2xl p-4 hover:bg-white/5 transition"
          >
            <h3 className="font-bold text-lg">
              🏠 Hogar
            </h3>

            <p className="text-sm text-muted-foreground mt-2">
              Para controlar gastos personales, ahorros y finanzas familiares.
            </p>
          </button>

          {/* Negocio continuo */}
          <button
            onClick={() => onSelect("continuous")}
            className="w-full text-left border border-cyan-500/20 rounded-2xl p-4 hover:bg-white/5 transition"
          >
            <h3 className="font-bold text-lg">
              🔄 Negocio de Flujo Continuo
            </h3>

            <p className="text-sm text-muted-foreground mt-2">
              Negocios con ingresos frecuentes como tiendas, restaurantes,
              impresión 3D, cafeterías y servicios.
            </p>
          </button>

          {/* Negocio productivo */}
          <button
            onClick={() => onSelect("productive")}
            className="w-full text-left border border-amber-500/20 rounded-2xl p-4 hover:bg-white/5 transition"
          >
            <h3 className="font-bold text-lg">
              🌱 Negocio de Ciclo Productivo
            </h3>

            <p className="text-sm text-muted-foreground mt-2">
              Agricultura, ganadería, piscicultura, cultivos y proyectos donde
              primero se invierte y luego se recupera el capital.
            </p>
          </button>

        </div>

      </div>
    </div>
  );
}