import React, { useEffect, useState } from "react";
import { useFinance } from "../context/FinanceContext";
import { Movimiento, TipoTransaccion } from "../types";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { X, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";

interface ProductiveTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimiento?: Movimiento | null;

  initialMovementType?: MovementType;
}
type MovementType =
  | "inversion"
  | "gasto"
  | "ingreso";

export function ProductiveTransactionModal({
  isOpen,
  onClose,
  movimiento,
  initialMovementType = "gasto",
}: ProductiveTransactionModalProps) {

  const {
  addMovimiento,
  updateMovimiento,
  partners,
  activeProfile,
} = useFinance();

  const [loading, setLoading] = useState(false);

  const [movementType, setMovementType] =
    useState<MovementType>(initialMovementType);

  const [monto, setMonto] =
    useState("");

  const [descripcion, setDescripcion] =
    useState("");

  const [fecha, setFecha] =
    useState(
      format(
        new Date(),
        "yyyy-MM-dd"
      )
    );
    const [partnerId, setPartnerId] = useState("");

  useEffect(() => {

    if (!isOpen) return;

    if (movimiento) {

      setMonto(
        String(movimiento.monto)
      );

      setDescripcion(
        movimiento.descripcion || ""
      );

      setFecha(
        movimiento.fecha.substring(0,10)
      );

      switch (movimiento.categoria) {
        
        case "inversion":

          setMovementType(
            "inversion"
          );

          break;

        case "ingreso":

          setMovementType(
            "ingreso"
          );

          break;

        default:

          setMovementType(
            "gasto"
          );

      }

    } else {

      setMovementType(
  initialMovementType
);

      setMonto("");

      setDescripcion("");

      setFecha(
        format(
          new Date(),
          "yyyy-MM-dd"
        )
      );

    }

  }, [isOpen, movimiento, initialMovementType]);

  if (!isOpen) return null;

  const getMovementData = () => {

    switch (movementType) {

      case "inversion":

  return {

    title:
      "Inversión",

    color:
      "text-violet-400",

    button:
      "Guardar inversión",

    tipo:
      "gasto_real" as TipoTransaccion,

    categoria:
      "inversion",

  };

      

      case "ingreso":

        return {

          title:
            "Ingreso",

          color:
            "text-emerald-400",

          button:
            "Registrar ingreso",

          tipo:
            "ingreso" as TipoTransaccion,

          categoria:
            "ingreso",

        };

      default:

        return {

          title:
            "Gasto",

          color:
            "text-rose-400",

          button:
            "Registrar gasto",

          tipo:
            "gasto_real" as TipoTransaccion,

          categoria:
            "gasto",

        };

    }

  };

  const movement =
    getMovementData();
  const handleSubmit = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    if (
      !monto ||
      Number(monto) <= 0
    ) {
      alert("Ingresa un monto válido.");
      return;
    }

    setLoading(true);

    try {

      const data = {

  partner_id: partnerId || null,

  tipo: movement.tipo,

  categoria: movement.categoria,

  monto: parseFloat(monto),

  descripcion:
    descripcion.trim() ||
    movement.title,

  fecha,
};

      if (movimiento) {

        await updateMovimiento(
          movimiento.id,
          data
        );

      } else {

        await addMovimiento(
          data
        );

      }

      onClose();

    } catch (error) {

      console.error(error);

      alert(
        "Ocurrió un error guardando el movimiento."
      );

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">

      <div

        className="absolute inset-0 bg-black/60 backdrop-blur-sm"

        onClick={onClose}

      />



      <div
        className={cn(
          "relative z-50 w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-card border border-white/10 shadow-2xl p-6 animate-in slide-in-from-bottom-full sm:zoom-in-95"
        )}
      >

        <button

          onClick={onClose}

          className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/5"

        >

          <X className="w-5 h-5"/>

        </button>



        <div className="mb-8">

          <h2
            className={cn(
              "text-2xl font-bold",
              movement.color
            )}
          >

            {

              movimiento

                ? "Editar movimiento"

                : movement.title

            }

          </h2>

          <p className="text-sm text-muted-foreground mt-1">
  {movementType === "inversion"
    ? "Registra una nueva inversión."
    : movementType === "gasto"
    ? "Registra un gasto relacionado con esta inversión."
    : "Registra un ingreso recibido por esta inversión."}
</p>

        </div>



        <form

          onSubmit={handleSubmit}

          className="space-y-5"

        >

          <div>

  <label className="text-sm font-medium">
    Selecciona el movimiento
  </label>

  <div className="grid grid-cols-3 gap-3 mt-3">

    <Button
    className="h-16"
      type="button"
      variant={movementType === "inversion" ? "default" : "outline"}
      onClick={() => setMovementType("inversion")}
    >
      💰 Inversión
    </Button>

    <Button
    className="h-16"
      type="button"
      variant={movementType === "gasto" ? "default" : "outline"}
      onClick={() => setMovementType("gasto")}
    >
      💸 Gasto
    </Button>

    <Button
    className="h-16"
      type="button"
      variant={movementType === "ingreso" ? "default" : "outline"}
      onClick={() => setMovementType("ingreso")}
    >
      💵 Ingreso
    </Button>

  </div>

</div>



          <div>

            <label className="text-sm font-medium">

              Monto

            </label>

            <Input

              type="number"

              required

              value={monto}

              onChange={(e)=>

                setMonto(e.target.value)

              }

              className="mt-2 h-12"

            />

          </div>



          <div>

            <label className="text-sm font-medium">

              Descripción

            </label>

            <Input

              value={descripcion}

              onChange={(e)=>

                setDescripcion(e.target.value)

              }

              placeholder="Describe el movimiento..."

              className="mt-2 h-12"

            />

          </div>
          <div>

  <label className="text-sm font-medium">
    Socio que realizó el movimiento
  </label>

  <select
    value={partnerId}
    onChange={(e) => setPartnerId(e.target.value)}
    className="mt-2 h-12 w-full rounded-lg border bg-background px-3"
  >

    <option value="">
      Empresa
    </option>

    {partners
      .filter(
        partner =>
          partner.profile_id === activeProfile?.id &&
          partner.active
      )
      .map((partner) => (
        <option
          key={partner.id}
          value={partner.id}
        >
          {partner.name}
        </option>
      ))}

  </select>

</div>
          {/* Fecha */}

          <div>

            <label className="text-sm font-medium">
              Fecha
            </label>

            <div className="relative mt-2">

              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
              />

              <Input
                type="date"
                value={fecha}
                onChange={(e) =>
                  setFecha(e.target.value)
                }
                className="pl-11 h-12"
              />

            </div>

          </div>

          {/* Información del movimiento */}

          <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">

            <h3 className="font-semibold mb-2">

              Resumen

            </h3>

            <div className="space-y-2 text-sm">

              <div className="flex justify-between">

                <span className="text-muted-foreground">

  Movimiento

</span>

                <span className="font-medium">

                  {movement.title}

                </span>

              </div>

              
              <div className="flex justify-between">

                <span className="text-muted-foreground">

                  Monto

                </span>

                <span className={movement.color}>

                  ${Number(monto || 0).toLocaleString()}

                </span>

              </div>

            </div>

          </div>

          {/* Botones */}

          <div className="flex gap-3 pt-4">

            <Button

              type="button"

              variant="outline"

              className="flex-1 h-12"

              onClick={onClose}

              disabled={loading}

            >

              Cancelar

            </Button>

            <Button

              type="submit"

              className="flex-1 h-12"

              disabled={loading}

            >

              {

                loading

                  ? "Guardando..."

                  : movimiento

                    ? "Actualizar"

                    : movement.button

              }

            </Button>

          </div>

        </form>

      </div>

    </div>

  );

}