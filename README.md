# Faro de Medianoche

Juego 002 de [Un juego cada día](https://mitchell-castillo.github.io/daily-games/). Arcade original de orientación y rescate: mantén la luz de un faro sobre cada velero hasta llenar su aro y guiarlo a puerto antes de que alcance las rocas.

- Jugar: https://mitchell-castillo.github.io/faro-de-medianoche/
- Repositorio independiente: https://github.com/mitchell-castillo/faro-de-medianoche
- Cinco noches de dificultad creciente, tres estrellas por una guardia sin pérdidas y puntos extra por rescates consecutivos.
- Cada noche permite perder hasta dos barcos. El tercero obliga a reintentar. No hay vidas ni compras limitadas.

## Controles

- Ratón: apunta hacia los barcos.
- Pantalla táctil: toca o arrastra sobre el mar. También hay dos botones para girar.
- Teclado: flechas izquierda/derecha o A/D. Espacio, P o Escape pausa/reanuda.
- Al cambiar de pestaña o perder el foco, el juego se pausa automáticamente. No transcurre tiempo mientras está cerrado o pausado.

## Guardado y privacidad

La clave única `daily-games:faro-de-medianoche:v1` de localStorage guarda la partida, las noches completadas, mejores puntuaciones y estrellas. Es independiente del guardado de Órbita de Rescate. No se borra ninguna clave ajena. El catálogo puede leer un resumen porque ambos repositorios se publican en el mismo origen GitHub Pages.

Sin cuentas, backend, analítica, cookies de seguimiento, fuentes remotas ni dependencias externas. El guardado pertenece a ese navegador/dispositivo; no se sincroniza. Borrar los datos del navegador o navegar en modo privado puede perderlo. Si el almacenamiento está bloqueado, aparece una advertencia y se permite jugar en memoria.

## Desarrollo

Sitio estático sin compilación. Requiere Node.js 24 para las pruebas y Python 3 para servirlo.

```sh
npm run check
npm start
# http://localhost:8080
```

- `engine.js`: simulación determinista, rutas de barcos, iluminación, puntuación y validación del estado.
- `progress.js`: guardado aislado y validado.
- `app.js`: interfaz, canvas y controles. Los gráficos se dibujan localmente.
- `tests/`: simulación, equilibrio de las cinco noches, guardado, recuperación y privacidad.

## Publicación

GitHub Pages: main → / (root). `.nojekyll` permite servir todos los archivos estáticos. El workflow `check.yml` valida sintaxis y pruebas en cada push o pull request, sin secretos. El juego y el catálogo se despliegan por separado.

Las rutas usan una secuencia de ángulo áureo con corrientes alternadas. La mecánica combina orientación continua, tiempo de iluminación y priorización por distancia, distinta del puzle de deslizamiento de la primera entrega.
