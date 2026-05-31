import { useState } from 'react';
import dashboardImg from '../assets/tutorial-completo/dashboard.jpeg';
import gastosFijosImg from '../assets/tutorial-completo/gastos-fijos.jpeg';
import cargarGastosFijosImg from '../assets/tutorial-completo/cargar gastos fijos.jpeg';
import movimientosImg from '../assets/tutorial-completo/movimientos.jpeg';
import ingresarImg from '../assets/tutorial-completo/ingresar.jpeg';
import nuevoGastoImg from '../assets/tutorial-completo/nuevo gasto.jpeg';
import nuevoIngresoImg from '../assets/tutorial-completo/nuevo ingreso.jpeg';
import categoriasImg from '../assets/tutorial-completo/categorias.jpeg';
import nuevaCategoriaImg from '../assets/tutorial-completo/nueva categoria.jpeg';
import bolsillosImg from '../assets/tutorial-completo/bolsillos.jpeg';
import nuevoAhorroImg from '../assets/tutorial-completo/nuevo ahorro.jpeg';
import estadisticasImg from '../assets/tutorial-completo/estadisticas.jpeg';
import ajustesImg from '../assets/tutorial-completo/ajustes.jpeg';
import ajustes2Img from '../assets/tutorial-completo/ajustes2.jpeg';
export default function Tutorial() {
    const [step, setStep] = useState(0);
    const tutorialSteps = [
      {
        image: dashboardImg,
        title: 'Disponible del mes',
        subtitle: 'Tu dinero disponible',
        text: 'Aquí puedes ver cuánto dinero tienes realmente disponible para gastar este mes.'
      },

      {
        image: dashboardImg,
        title: 'Ingresos',
        subtitle: 'Todo lo que has recibido',
        text: 'Aquí se muestra el total de dinero que has recibido durante el período actual.'
      },

      {
        image: dashboardImg,
        title: 'Gastos',
        subtitle: 'Todo lo que has gastado',
        text: 'Aquí se registra todo el dinero que has gastado, incluyendo el que has destinado a tus ahorros. AMARA lo descuenta de tu disponible para ayudarte a proteger tus metas de ahorro.'
      },

      {
        image: dashboardImg,
        title: 'Ir a Gastos Fijos',
        subtitle: 'Configura tus pagos recurrentes',
        text: 'Te recomendamos configurar primero tus gastos fijos para que AMARA pueda calcular con mayor precisión tu dinero disponible.',
        showIndicator: true,
          indicatorBottom: 5,
          indicatorRight: 1
      },

      {
        image: gastosFijosImg,
        title: 'Gastos Fijos',
        subtitle: 'Pagos que se repiten cada mes',
        text: 'Registra aquí los gastos que realizas de forma recurrente, como arriendo, internet, servicios o suscripciones.'
      },

      {
        image: movimientosImg,
        title: 'Movimientos',
        subtitle: 'Historial financiero',
        text: 'En esta sección encontrarás todos los ingresos, gastos y movimientos registrados en tu cuenta.'
      },

      {
        image: movimientosImg,
        title: 'Registrar movimiento',
        subtitle: 'Añade nueva información',
        text: 'Utiliza este botón para registrar nuevos ingresos, gastos o gastos fijos.',
        showIndicator: true,
          indicatorBottom: 6.5,
          indicatorRight: 1

      },

      {
        image: ingresarImg,
        title: 'Menú de registro',
        subtitle: 'Tres formas de registrar información',
        text: 'Desde aquí puedes registrar un nuevo gasto, un nuevo ingreso o crear gastos fijos para automatizar tu control financiero.'
      },

      {
        image: ingresarImg,
        title: 'Nuevo Gasto',
        subtitle: 'Registra una salida de dinero',
        text: 'Selecciona esta opción para registrar cualquier gasto realizado y mantener actualizado tu balance.'
      },

      {
        image: nuevoGastoImg,
        title: 'Formulario de gasto',
        subtitle: 'Completa la información',
        text: 'Ingresa la descripción, categoría y valor del gasto para registrarlo correctamente.'
      },

      {
        image: ingresarImg,
        title: 'Nuevo Ingreso',
        subtitle: 'Registra dinero recibido',
        text: 'Selecciona esta opción para registrar salarios, ventas o cualquier dinero que recibas.'
      },

      {
        image: nuevoIngresoImg,
        title: 'Formulario de ingreso',
        subtitle: 'Aumenta tu disponible',
        text: 'Cada ingreso que registres aumentará tu disponible y mejorará la precisión de tus estadísticas.'
      },

      {
        image: ingresarImg,
        title: 'Cargar Gasto Fijo',
        subtitle: 'Registra gastos recurrentes',
        text: 'Selecciona esta opción para crear gastos que se repiten periódicamente.'
      },

      {
        image: cargarGastosFijosImg,
        title: 'Carga múltiple de gastos fijos',
        subtitle: 'Configura varios gastos rápidamente',
        text: 'Puedes registrar varios gastos fijos en una sola operación para ahorrar tiempo durante la configuración inicial.'
      },

      {
        image: categoriasImg,
        title: 'Categorías',
        subtitle: 'Organiza tus movimientos',
        text: 'Las categorías permiten clasificar ingresos y gastos para obtener reportes más claros y detallados.'
      },

      {
        image: categoriasImg,
        title: 'Crear categoría',
        subtitle: 'Personaliza tu organización',
        text: 'Si ninguna categoría se adapta a tus necesidades, puedes crear una completamente personalizada.',
        showIndicator: true,
                  indicatorBottom:49,
                  indicatorRight: 1

      },

      {
        image: nuevaCategoriaImg,
        title: 'Nueva Categoría',
        subtitle: 'Crea una clasificación propia',
        text: 'Define categorías específicas para adaptar AMARA a tu forma de administrar el dinero.'
      },

      {
        image: bolsillosImg,
        title: 'Ahorros',
        subtitle: 'Protege tus metas financieras',
        text: 'Los ahorros te ayudan a separar dinero para objetivos específicos y evitar gastarlo por accidente.'
      },

      {
        image: bolsillosImg,
        title: 'Nuevo Ahorro',
        subtitle: 'Crea una nueva meta',
        text: 'Utiliza este botón para crear un nuevo objetivo de ahorro.',
        showIndicator: true,
                          indicatorBottom:49,
                          indicatorRight: 1
      },

      {
        image: nuevoAhorroImg,
        title: 'Meta de ahorro',
        subtitle: 'Construye tus objetivos',
        text: 'Asigna un nombre y un objetivo para comenzar a construir tus metas de ahorro dentro de AMARA.'
      },

      {
        image: nuevoAhorroImg,
        title: '¿Cómo funcionan los ahorros?',
        subtitle: 'Dinero reservado',
        text: 'El dinero guardado en ahorros sigue siendo tuyo. Sin embargo, AMARA lo descuenta del disponible para ayudarte a cumplir tus metas.'
      },

      {
        image: estadisticasImg,
        title: 'Estadísticas',
        subtitle: 'Analiza tus hábitos financieros',
        text: 'Visualiza gráficos y tendencias para comprender mejor cómo administras tu dinero.'
      },

      {
        image: dashboardImg,
        title: 'Ir a Ajustes',
        subtitle: 'Opciones y ayuda',
        text: 'Desde aquí podrás personalizar AMARA y acceder nuevamente a este tutorial cuando lo necesites.',
        showIndicator: true,
                          indicatorBottom:46.5,
                          indicatorRight:1.6
      },

      {
        image: ajustesImg,
        title: 'Ajustes',
        subtitle: 'Personaliza tu experiencia',
        text: 'En esta sección encontrarás configuraciones, herramientas y acceso al tutorial completo de la aplicación.'
      },

      {
        image: ajustes2Img,
        title: 'Tutorial completo',
        subtitle: 'Siempre disponible',
        text: 'Puedes volver a consultar este tutorial en cualquier momento desde la sección de ajustes.'
      },

      {
        image: dashboardImg,
        title: '¡Listo!',
        subtitle: 'Ya conoces AMARA',
        text: 'Ahora conoces las principales funciones de AMARA. Comienza registrando tus gastos fijos y mantén tus finanzas organizadas.'
      }
    ];
  return (
    <div className="relative">
    {/* Zona izquierda */}
    <div
      className="absolute left-0 top-0 w-1/2 h-full z-20"
      onClick={() => {
        if (step > 0) {
          setStep(step - 1);
        }
      }}
    />

    {/* Zona derecha */}
    <div
      className="absolute right-0 top-0 w-1/2 h-full z-20"
      onClick={() => {
        if (step < tutorialSteps.length - 1) {
          setStep(step + 1);
        }
      }}
    />

      <img
        src={tutorialSteps[step]?.image}
        alt="Tutorial"
        className="w-full"
      />

      {tutorialSteps[step]?.showIndicator && (
        <div
          className="absolute z-10"
          style={{
            bottom: `${tutorialSteps[step]?.indicatorBottom ?? 37}rem`,
            right: `${tutorialSteps[step]?.indicatorRight ?? 4}rem`
          }}
        >
          <div className="w-16 h-16 rounded-full bg-red-500/50 animate-pulse" />
        </div>
      )}

      <div className={`absolute left-8 right-8 z-10 bg-black/80 rounded-3xl p-5 ${
        [3, 6,7,8,9,10,11,12,13,].includes(step) ? 'top-12' : 'bottom-24'
      }`}>

        <span className="text-[#00E676] text-xs uppercase tracking-[0.2em] font-bold">
          {tutorialSteps[step]?.title}
        </span>

        <h2 className="text-white text-2xl font-black mt-2">
          {tutorialSteps[step]?.subtitle}
        </h2>

        <p className="text-white/90 mt-3">
          {tutorialSteps[step]?.text}
        </p>

      </div>

    </div>
  );
}