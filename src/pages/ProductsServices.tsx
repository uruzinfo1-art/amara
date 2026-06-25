import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import React from "react";

export default function ProductsServices() {
  const [showModal, setShowModal] = React.useState(false);
  const [type, setType] = React.useState<"product" | "service" | null>(null);
  const [name, setName] = React.useState("");
  const [stock, setStock] = React.useState(0);
  const [items, setItems] = React.useState<any[]>(() => {
  const saved = localStorage.getItem("products_services");
  return saved ? JSON.parse(saved) : [];
});

const [editingId, setEditingId] = React.useState<string | null>(null);
  
React.useEffect(() => {

  localStorage.setItem(
    "products_services",
    JSON.stringify(items)
  );

}, [items]);
const products = items.filter(
  (item) => item.type === "product"
);

const services = items.filter(
  (item) => item.type === "service"
);
  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Productos y Servicios
          </h1>

          <p className="text-muted-foreground">
            Administra los productos y servicios de tu negocio.
          </p>
        </div>

        <Button onClick={() => setShowModal(true)}>
  + Nuevo
</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

  {/* PRODUCTOS */}
  <Card>
    <CardContent className="p-6">

      <h2 className="text-xl font-bold mb-4">
        📦 Productos
      </h2>

      {products.length === 0 ? (
        <div className="text-muted-foreground">
          No hay productos registrados.
        </div>
      ) : (
        <div className="space-y-3">

          {products.map((item: any) => (

            <div
              key={item.id}
              className="border border-white/10 rounded-2xl p-4"
            >

              <h3 className="font-semibold">
                {item.name}
              </h3>

              <p className="text-sm text-muted-foreground">
                Stock: {item.stock}
              </p>
              <div className="flex gap-2 mt-3">

  <Button
  variant="outline"
  onClick={() => {
    setEditingId(item.id)
    setType(item.type);
    setName(item.name);
    setStock(item.stock || 0);
    setShowModal(true);
  }}
>
  Editar
</Button>

  <Button
  variant="outline"
  onClick={() =>
    setItems(items.filter((i) => i.id !== item.id))
  }
>
  Eliminar
</Button>

</div>

            </div>

          ))}

        </div>
      )}

    </CardContent>
  </Card>


  {/* SERVICIOS */}
  <Card>
    <CardContent className="p-6">

      <h2 className="text-xl font-bold mb-4">
        🛠 Servicios
      </h2>

      {services.length === 0 ? (
        <div className="text-muted-foreground">
          No hay servicios registrados.
        </div>
      ) : (
        <div className="space-y-3">

          {services.map((item: any) => (

            <div
              key={item.id}
              className="border border-white/10 rounded-2xl p-4"
            >

              <h3 className="font-semibold">
                {item.name}
              </h3>

              <p className="text-sm text-muted-foreground">
                Servicio
              </p>
              <div className="flex gap-2 mt-3">

  <Button
  variant="outline"
  onClick={() => {
    setEditingId(item.id);
    setType(item.type);
    setName(item.name);
    setStock(item.stock || 0);
    setShowModal(true);
  }}
>
  Editar
</Button>

  <Button
  variant="outline"
  onClick={() =>
    setItems(items.filter((i) => i.id !== item.id))
  }
>
  Eliminar
</Button>

</div>

            </div>

          ))}

        </div>
      )}

    </CardContent>
  </Card>

</div>
      
{showModal && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

    <div className="bg-card border border-white/10 rounded-3xl p-6 w-full max-w-md">

      <h2 className="text-xl font-bold mb-4">
        Nuevo producto o servicio
      </h2>
      <div className="space-y-3 mb-4">

  <button
  onClick={() => setType("product")}
  className="w-full p-3 rounded-2xl border border-white/10 hover:border-primary"
>
  Producto
</button>

  <button
  onClick={() => setType("service")}
  className="w-full p-3 rounded-2xl border border-white/10 hover:border-primary"
>
  Servicio
</button>

</div>
      <Button onClick={() => setShowModal(false)}>
        Cerrar
      </Button>
      <Button
  className="w-full mt-3"
  onClick={() => {

    if (!type || !name.trim()) return;

    if (editingId) {

      setItems(
        items.map((item) =>
          item.id === editingId
            ? {
                ...item,
                name,
                type,
                stock: type === "product" ? stock : 0,
              }
            : item
        )
      );

    } else {

      const newItem = {
        id: crypto.randomUUID(),
        type,
        name,
        stock: type === "product" ? stock : 0,
      };

      setItems([...items, newItem]);

    }

    setEditingId(null);
    setName("");
    setStock(0);
    setType(null);
    setShowModal(false);

  }}
>
  Guardar
</Button>
      {type && (
  <div className="mt-4 text-center text-primary font-medium">
    Seleccionado: {type === "product" ? "Producto" : "Servicio"}
  </div>
)}
{type && (
  <div className="mt-4 space-y-2">

    <label className="text-sm text-muted-foreground">
      Nombre
    </label>

    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder={
        type === "product"
          ? "Ej: Filamento PLA Negro"
          : "Ej: Diseño 3D"
      }
      className="w-full rounded-2xl border border-white/10 bg-background p-3 outline-none"
    />
{type === "product" && (
  <div className="mt-4 space-y-2">

    <label className="text-sm text-muted-foreground">
      Stock inicial
    </label>

    <input
  type="number"
  value={stock}
  onChange={(e) => setStock(Number(e.target.value))}
  placeholder="0"
  className="w-full rounded-2xl border border-white/10 bg-background p-3 outline-none"
/>

  </div>
)}
  </div>
)}
    </div>

  </div>
)}
    </div>
  );
}