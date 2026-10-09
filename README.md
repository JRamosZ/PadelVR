# 🎾 Sistema de Marcador Electrónico para Pádel

Sistema de marcador electrónico inteligente para canchas de pádel, diseñado para registrar automáticamente la puntuación de un partido mediante sensores instalados en la cancha y mostrar el estado del partido en una pantalla visible para los jugadores.

El objetivo del proyecto es crear un sistema **simple, modular y de bajo costo**, que reduzca la necesidad de llevar manualmente la puntuación y que, al mismo tiempo, proporcione información útil durante el partido, como cambios de lado, ventajas y estado del set.

El sistema está pensado para funcionar **localmente dentro de la cancha**, sin depender de la conexión a Internet del club.

---

## 🎯 Objetivos

- Registrar automáticamente los puntos obtenidos durante un partido.
- Mostrar el marcador de manera clara y visible para todos los jugadores.
- Reducir errores al llevar la puntuación manualmente.
- Indicar cuándo corresponde realizar un cambio de lado.
- Manejar correctamente situaciones como `40-40`, ventaja y punto de oro, dependiendo de la configuración del partido.
- Permitir configurar el partido desde un dispositivo móvil.
- Mantener el funcionamiento de la cancha aunque no exista conexión a Internet.
- Diseñar un sistema modular donde los sensores puedan reemplazarse o evolucionar sin modificar el resto de la plataforma.
- Crear una arquitectura que permita posteriormente administrar múltiples canchas.

---

# 🏗️ Arquitectura general

El sistema está compuesto por tres elementos principales:

```text
                    ┌─────────────────────┐
                    │   Teléfono móvil    │
                    │  Configuración      │
                    │  del partido        │
                    └──────────┬──────────┘
                               │
                               │ Wi-Fi local
                               ▼
                    ┌─────────────────────┐
                    │   Raspberry Pi      │
                    │                     │
                    │    Match Engine     │
                    │    API / Backend    │
                    │    Estado del match │
                    └───────┬─────┬───────┘
                            │     │
                Wi-Fi local │     │ HDMI / Display
                            │     ▼
               ┌────────────┴─────────────┐
               │                          │
        ┌──────▼──────┐            ┌──────▼──────┐
        │ ESP32       │            │   Display   │
        │ Sensor      │            │   marcador  │
        └──────┬──────┘            └─────────────┘
               │
       ┌───────┴────────┐
       │                │
   VL53L1X          RCWL-0516
     ToF             Radar
```

La comunicación entre los módulos se realiza mediante una **red Wi-Fi local creada por el propio sistema**, de manera que el marcador no depende de Internet para funcionar.

---

# 🧠 Match Engine

El **Match Engine** es el componente encargado de controlar la lógica del partido.

No se limita a almacenar el marcador actual. Es responsable de interpretar los eventos recibidos desde los sensores y determinar cómo debe evolucionar el partido.

Entre sus responsabilidades se encuentran:

- Registrar puntos.
- Determinar qué pareja ganó cada punto.
- Actualizar juegos.
- Actualizar sets.
- Determinar ventajas.
- Detectar cambios de lado.
- Determinar cuándo termina un juego.
- Determinar cuándo termina un set.
- Determinar cuándo termina el partido.
- Mantener el estado actual del partido.
- Validar que los eventos recibidos sean válidos.
- Evitar que un mismo evento sea registrado múltiples veces.

El hardware de detección **no debe encargarse de la lógica del marcador**.

Por ejemplo:

```text
Sensor
   │
   │ "Pair A scored"
   ▼
Raspberry Pi
   │
   ▼
Match Engine
   │
   ├── actualiza puntos
   ├── verifica juego
   ├── verifica set
   ├── verifica cambio de lado
   └── actualiza display
```

Esto permite cambiar posteriormente la tecnología utilizada para detectar el golpe sin tener que modificar la lógica completa del sistema.

### Integración de comandos de sensores

El backend recibe comandos mediante `POST /api/v1/sensor-commands`:

```json
{
  "commandId": "cmd_000124",
  "sensorId": "sensor_left",
  "command": "ADD_POINT",
  "sequence": 124,
  "timestamp": "2026-10-09T19:59:59.000Z"
}
```

El sensor no envía `matchId` ni equipo. El backend localiza la cancha y el partido más reciente a partir del sensor registrado, traduce su lado físico (`LEFT`/`RIGHT`) al equipo que ocupa ese lado actualmente y llama al Match Engine. El primer `ADD_POINT` inicia un partido en estado `READY`. Los comandos se procesan de forma idempotente por `commandId` y por la combinación de sensor y secuencia; las secuencias atrasadas se rechazan.

La transición del marcador, los documentos `MatchEvent` y el `SensorEvent` se guardan en una transacción de MongoDB. Por ello, MongoDB debe ejecutarse como replica set o clúster compatible con transacciones.

La pantalla puede suscribirse a `ws://<servidor>:<puerto>/ws?matchId=<id>`. Recibirá un mensaje `match.subscribed` al conectarse y mensajes `match.updated` con el estado, la revisión y los eventos de cada transición. Cada actualización se envía únicamente a clientes suscritos a ese partido.

---

# 🎾 Detección del punto

Cada lado de la cancha contará con módulos de sensores capaces de detectar la interacción del jugador con el sistema.

La implementación inicial utiliza:

- **ESP32**
- **VL53L1X** — sensor de distancia ToF
- **RCWL-0516** — sensor de movimiento basado en microondas
- LEDs para pruebas y diagnóstico

La detección final podrá evolucionar hacia otra tecnología si durante las pruebas se encuentra una alternativa más confiable.

La intención es que el sistema pueda determinar que un jugador ha realizado la acción necesaria para registrar el punto sin requerir que presione un botón físico.

---

# 📱 Configuración del partido

Antes de comenzar un partido, los jugadores podrán acceder mediante un teléfono móvil a la interfaz de configuración.

El display de la cancha mostrará un **QR Code** que permitirá acceder rápidamente a esta interfaz.

La configuración incluirá, entre otros:

- Nombre de los jugadores.
- Nombre de las parejas.
- Condiciones del partido.
- Sistema de puntuación.
- Número de sets.
- Configuración de ventaja / punto de oro.
- Información adicional necesaria para el partido.

Una vez terminada la configuración, el partido podrá comenzar.

---

# 🔄 Flujo completo de un partido

## 1. Llegada de los jugadores

Los cuatro jugadores llegan a la cancha.

El marcador se encuentra en estado:

```text
┌─────────────────────────────┐
│                             │
│       READY TO PLAY         │
│                             │
│          [ QR ]             │
│                             │
└─────────────────────────────┘
```

El sistema está esperando que se configure un nuevo partido.

---

## 2. Escanear el QR

Uno de los jugadores escanea el código QR mostrado en el marcador utilizando su teléfono.

El QR abre la interfaz web local del sistema.

No es necesario instalar una aplicación.

```text
Jugador
   │
   ▼
Escanea QR
   │
   ▼
Página de configuración
```

---

## 3. Configurar jugadores

El usuario introduce los nombres de los cuatro jugadores y define las parejas.

Por ejemplo:

```text
Pareja A
  Jorge
  Carlos

Pareja B
  Luis
  Miguel
```

La interfaz deberá permitir identificar claramente qué jugadores pertenecen a cada pareja.

---

## 4. Configurar las reglas

El usuario selecciona las condiciones del partido.

Por ejemplo:

```text
Sets:             2 de 3
Games por set:    6
Tie-break:        Sí
Ventaja:          Sí
```

La configuración deberá permitir adaptar el marcador a las reglas utilizadas por el club.

---

## 5. Confirmar partido

Una vez configurado todo, el usuario confirma:

**Iniciar partido**

El sistema valida la configuración y crea una nueva instancia de partido.

El Match Engine pasa del estado:

```text
READY
```

a:

```text
ACTIVE
```

---

# 🟢 Inicio del partido

El marcador muestra:

```text
Jorge / Carlos
0     -     0
Luis / Miguel

SET 1
GAME 1
```

Los sensores comienzan a aceptar eventos.

El sistema queda preparado para registrar el primer punto.

---

# 🏓 Durante el partido

Cada punto sigue aproximadamente este flujo:

```text
Jugador gana el punto
        │
        ▼
Interacción con sensor
        │
        ▼
ESP32 detecta evento
        │
        ▼
Evento enviado por Wi-Fi
        │
        ▼
Raspberry Pi
        │
        ▼
Match Engine
        │
        ▼
Actualización del marcador
        │
        ▼
Display
```

---

# 1️⃣ Se gana un punto

Supongamos que gana el punto la pareja A.

El sensor correspondiente genera un evento:

```text
POINT_WON
team: A
```

El ESP32 transmite el evento al sistema central.

---

# 2️⃣ El Match Engine procesa el evento

El Match Engine recibe el evento y verifica el estado actual.

Por ejemplo:

```text
Pareja A: 30
Pareja B: 15
```

Después del punto:

```text
Pareja A: 40
Pareja B: 15
```

El marcador se actualiza inmediatamente.

---

# 3️⃣ El marcador muestra el nuevo estado

El display refleja el estado actual:

```text
┌─────────────────────────────┐
│   JORGE / CARLOS            │
│                             │
│          40                 │
│                             │
│   LUIS / MIGUEL             │
│          15                 │
│                             │
│          SET 1              │
│          GAME 1             │
└─────────────────────────────┘
```

Los jugadores no necesitan realizar ninguna acción adicional.

---

# 🔁 Repetición de puntos

El mismo proceso se repite durante el juego:

```text
Punto
  ↓
Detección
  ↓
Evento
  ↓
Match Engine
  ↓
Actualización
  ↓
Display
```

El sistema mantiene internamente el estado completo del partido.

---

# ⚖️ Empate 40-40

Cuando ambas parejas llegan a 40:

```text
40 - 40
```

el Match Engine consulta la configuración del partido.

Si se utiliza ventaja:

```text
DEUCE
```

El siguiente punto genera:

```text
ADVANTAGE A
```

o:

```text
ADVANTAGE B
```

Si la pareja con ventaja pierde el siguiente punto, el marcador vuelve a:

```text
DEUCE
```

Si gana el siguiente punto, gana el juego.

---

# 🏆 Fin de un juego

Cuando una pareja gana el juego, el Match Engine:

1. Incrementa el número de juegos de la pareja.
2. Reinicia los puntos.
3. Determina quién inicia el siguiente juego.
4. Comprueba si debe realizarse un cambio de lado.
5. Actualiza el display.

Por ejemplo:

```text
Antes:

Jorge / Carlos     3
Luis / Miguel      2

40 - 30
```

Después de ganar el punto:

```text
Jorge / Carlos     4
Luis / Miguel      2

GAME
```

Los puntos vuelven a:

```text
0 - 0
```

---

# 🔄 Cambio de lado

El sistema también será responsable de determinar cuándo corresponde cambiar de lado.

Cuando se alcanza una condición que requiere cambio de lado, el marcador lo indicará claramente.

Por ejemplo:

```text
┌─────────────────────────────┐
│                             │
│       CHANGE SIDES          │
│                             │
│      Cambien de lado        │
│                             │
└─────────────────────────────┘
```

Los jugadores realizan físicamente el cambio y continúan el partido.

El sistema mantiene la información del partido independientemente de la posición física de los jugadores.

---

# 🏆 Fin de un set

Cuando una pareja cumple las condiciones necesarias para ganar el set, el Match Engine registra el resultado.

Por ejemplo:

```text
SET 1

Jorge / Carlos     6
Luis / Miguel      4
```

El sistema determina si:

- El partido continúa con otro set.
- Es necesario un tie-break.
- El partido ha terminado.

---

# 🏆 Fin del partido

Cuando una pareja cumple las condiciones necesarias para ganar el partido, el Match Engine cambia el estado del partido a:

```text
FINISHED
```

El display muestra el resultado final.

Por ejemplo:

```text
┌─────────────────────────────┐
│        MATCH FINISHED       │
│                             │
│    JORGE / CARLOS           │
│                             │
│          2 - 1              │
│                             │
│    LUIS / MIGUEL             │
│                             │
│      WINNERS 🏆             │
└─────────────────────────────┘
```

El resultado queda almacenado para poder consultarlo posteriormente.

---

# 📊 Estados del partido

El sistema manejará diferentes estados para controlar el ciclo de vida de un partido:

```text
READY
  │
  ▼
CONFIGURING
  │
  ▼
ACTIVE
  │
  ├── GAME
  │
  ├── CHANGE_SIDE
  │
  ├── SET_FINISHED
  │
  └── ...
       │
       ▼
   FINISHED
```

Esto permite que el frontend, el display y los dispositivos físicos conozcan en todo momento qué está ocurriendo.

---

# 🌐 Funcionamiento sin Internet

Una característica importante del proyecto es que **Internet no es un requisito para jugar**.

La cancha contará con una red local propia.

```text
              ┌──────────────────┐
              │   Raspberry Pi   │
              │  Wi-Fi Hotspot   │
              └────────┬─────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
     ESP32          Teléfono       Display
    Sensor          jugador
```

Esto permite que:

- Los sensores funcionen sin Internet.
- El marcador continúe funcionando aunque el club pierda conexión.
- La configuración pueda realizarse desde el teléfono.
- La comunicación entre sensores y Raspberry Pi sea directa.
- La latencia sea menor y más predecible.
- El sistema sea independiente de la infraestructura de red del club.

Internet podría utilizarse posteriormente para sincronización, estadísticas, administración remota o actualización del sistema, pero **no debe ser necesario para operar el marcador**.

---

# 🧩 Filosofía de diseño

El proyecto busca mantener una separación clara entre hardware, comunicación y lógica de negocio.

```text
┌───────────────────────────────────────┐
│             FRONTEND                  │
│                                       │
│ Configuración / Estado / Resultados   │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│              BACKEND                  │
│                                       │
│ API + Match Engine + Persistencia     │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│             HARDWARE                  │
│                                       │
│ ESP32 + sensores + display            │
└───────────────────────────────────────┘
```

El hardware únicamente debe detectar y transmitir eventos.

El Match Engine debe encargarse de decidir qué significa cada evento.

Esto permitirá sustituir sensores o modificar el hardware sin tener que reconstruir la lógica del partido.

---

# 🛠️ Hardware inicial

## Controlador

- ESP32

## Sensores

- VL53L1X — Time of Flight
- RCWL-0516 — detección de movimiento

## Indicadores

- LEDs de estado y diagnóstico

## Unidad central

- Raspberry Pi

## Display

Pantalla ubicada en una posición visible desde la cancha.

El sistema busca utilizar un display dinámico en lugar de un marcador LED tradicional, permitiendo mostrar:

- Marcador.
- Nombres.
- Cambios de lado.
- Ventajas.
- Mensajes de estado.
- QR Code.
- Resultado final.
- Información futura del partido.

---

# 💻 Stack de software

La implementación inicial del sistema utiliza una arquitectura basada en:

### Frontend

- React
- JavaScript
- Interfaz web responsive

### Backend

- Node.js
- Express

### Base de datos

- MongoDB

### Hardware

- ESP32
- Raspberry Pi
- VL53L1X
- RCWL-0516

### Comunicación

- Wi-Fi local
- HTTP / WebSocket según las necesidades de cada componente

---

# 🗄️ Persistencia

Aunque el partido debe poder continuar funcionando incluso ante problemas de conectividad externa, el sistema mantiene información del partido para permitir:

- Recuperar el estado del partido.
- Consultar resultados.
- Registrar partidos terminados.
- Generar estadísticas posteriormente.
- Auditar eventos.
- Analizar errores de detección.

Un objetivo importante es que el sistema no dependa exclusivamente del estado visual del marcador.

El **estado real del partido pertenece al Match Engine**.

---

# 🔮 Evolución futura

El proyecto está diseñado para poder crecer más allá de un simple marcador.

Algunas funcionalidades que podrán incorporarse posteriormente:

- Estadísticas de jugadores.
- Historial de partidos.
- Ranking del club.
- Estadísticas de puntos.
- Control de múltiples canchas.
- Administración centralizada del club.
- Integración con torneos.
- Sincronización con Internet.
- Aplicación móvil.
- Notificaciones.
- Repetición o análisis de puntos.
- Identificación automática de jugadores.
- Diferentes modos de puntuación.
- Integración con sistemas de reservas.

La arquitectura inicial debe evitar bloquear estas posibilidades.

---

# 🚧 Estado actual del proyecto

El proyecto se encuentra en etapa de desarrollo y prototipado.

Actualmente se está trabajando principalmente en:

- Prototipo de detección de eventos.
- Comunicación entre ESP32 y Raspberry Pi.
- Evaluación de sensores.
- Pruebas con VL53L1X.
- Pruebas con RCWL-0516.
- Definición del protocolo de comunicación.
- Diseño del Match Engine.
- Diseño de la base de datos.
- Flujo de configuración del partido.
- Diseño de la interfaz del marcador.

La detección automática del punto es uno de los principales retos técnicos del proyecto y se considera un componente intercambiable de la arquitectura.

---

# 🎯 Principio fundamental

El objetivo final no es simplemente construir un dispositivo que muestre un marcador.

El objetivo es construir un **sistema electrónico de arbitraje y seguimiento de partidos de pádel**, capaz de integrarse naturalmente en la experiencia de los jugadores.

El jugador debería poder llegar a la cancha, escanear un QR, configurar el partido y comenzar a jugar sin tener que aprender a utilizar un dispositivo complejo.

Durante el partido, el sistema debe desaparecer en segundo plano:

> **Los jugadores juegan. El sistema se encarga del marcador.**

---
