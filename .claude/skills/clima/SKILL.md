---
name: clima
description: Consulta el clima actual y el pronóstico de San José, Costa Rica por defecto (o de otra ciudad indicada) usando wttr.in. Usar cuando pidan "clima", "tiempo", "temperatura", "va a llover", "pronóstico" o /clima.
argument-hint: "[ciudad opcional]"
allowed-tools: Bash(curl *)
---

# Clima local

Obtiene el clima de San José, Costa Rica (o de la ciudad indicada) y lo resume en español.

## Pasos

1. Determina la ubicación:
   - Si el usuario pasó una ciudad (`$ARGUMENTS`), úsala. Reemplaza espacios por `+` (ej. `Ciudad+de+Mexico`).
   - Si no, usa por defecto `San+Jose,Costa+Rica`.

2. Consulta el clima actual en formato compacto:

   ```bash
   curl -s "https://wttr.in/<ciudad>?format=%l:+%c+%t+(sensación+%f),+humedad+%h,+viento+%w,+lluvia+%p&lang=es&m"
   ```

3. Si el usuario pidió pronóstico (hoy, mañana, semana, "va a llover"), pide el detalle en JSON:

   ```bash
   curl -s "https://wttr.in/<ciudad>?format=j1&lang=es"
   ```

   Campos útiles: `current_condition[0]` (`temp_C`, `FeelsLikeC`, `humidity`, `windspeedKmph`, `lang_es[0].value`) y `weather[0..2]` (`maxtempC`, `mintempC`, `hourly[].chanceofrain`).

## Formato de respuesta

- Responde en español, breve: ubicación, condición, temperatura (°C), sensación térmica, humedad, viento y probabilidad de lluvia.
- Si hay pronóstico, una línea por día.
- Termina con una recomendación corta solo si es relevante (paraguas, abrigo).

## Notas

- Si `curl` falla o devuelve vacío/HTML de error, dilo claramente y sugiere indicar la ciudad manualmente. No inventes datos.
- La ubicación por defecto es San José, Costa Rica; no uses detección por IP.
- Unidades métricas (`m`). Para Fahrenheit/mph, cambia `m` por `u`.
