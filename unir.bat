@echo off
chcp 65001 >nul
echo.
echo  ╔══════════════════════════════════════╗
echo  ║   Finca SantaFe - Uniendo archivos  ║
echo  ╚══════════════════════════════════════╝
echo.

:: Verificar que existen todos los archivos
if not exist "parte1.html"  (echo [ERROR] Falta parte1.html  & pause & exit /b 1)
if not exist "parte2.html"  (echo [ERROR] Falta parte2.html  & pause & exit /b 1)
if not exist "parte3a.html" (echo [ERROR] Falta parte3a.html & pause & exit /b 1)
if not exist "parte3b.html" (echo [ERROR] Falta parte3b.html & pause & exit /b 1)
if not exist "parte4a.js"   (echo [ERROR] Falta parte4a.js   & pause & exit /b 1)
if not exist "parte4b.js"   (echo [ERROR] Falta parte4b.js   & pause & exit /b 1)

echo  [1/4] Uniendo HTML...
type parte1.html  > index.html
type parte2.html >> index.html
type parte3a.html >> index.html
type parte3b.html >> index.html

echo  [2/4] Insertando JavaScript...
echo. >> index.html
echo ^<script^> >> index.html
type parte4a.js >> index.html
echo. >> index.html
type parte4b.js >> index.html
echo ^</script^> >> index.html

echo  [3/4] Cerrando documento...
echo ^</body^> >> index.html
echo ^</html^> >> index.html

echo  [4/4] Verificando...
for %%F in (index.html) do echo  Tamanio: %%~zF bytes

echo.
echo  [OK] index.html creado exitosamente!
echo  Ahora puedes subir la carpeta a Vercel.
echo.
pause
