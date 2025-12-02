const input = document.getElementById("searchInput");
const btn = document.getElementById("btnSearch");
const resultados = document.getElementById("resultados");

// ---- FUNCIÓN PARA BUSCAR EN SPOTIFY ----
async function buscarCanciones() {
  const q = input.value.trim();
  if (!q) return;

  resultados.innerHTML = `<p class="text-gray-400 text-sm">Buscando...</p>`;

  try {
    const resp = await fetch(`https://otro-tema-free.onrender.com/api/search?q=${encodeURIComponent(q)}`);
    const data = await resp.json();

    if (!resp.ok) {
      resultados.innerHTML = `<p class="text-red-400 text-sm">Error al buscar canciones.</p>`;
      return;
    }

    mostrarResultados(data);
  } catch (err) {
    resultados.innerHTML = `<p class="text-red-400 text-sm">Error de conexión.</p>`;
  }
}

// ---- MOSTRAR CANCIONES ----
function mostrarResultados(tracks) {
  resultados.innerHTML = "";

  if (!tracks.length) {
    resultados.innerHTML = `<p class="text-gray-400 text-sm">No se encontraron canciones.</p>`;
    return;
  }

  tracks.forEach(track => {
    const div = document.createElement("div");

    div.className = "bg-gray-700 p-3 rounded flex items-center gap-3 hover:bg-gray-600 cursor-pointer";

    div.innerHTML = `
      <img src="${track.album.images?.[2]?.url || track.album.images?.[0]?.url || ""}" 
           class="w-12 h-12 rounded" />

      <div class="flex-1">
        <p class="font-semibold">${track.name}</p>
        <p class="text-gray-300 text-sm">${track.artists[0].name}</p>
      </div>

      <button class="px-3 py-1 bg-green-600 rounded hover:bg-green-500 text-sm">
        Agregar
      </button>
    `;

    // EVENTO DE "AGREGAR A LA COLA"
    div.querySelector("button").addEventListener("click", () => {
      agregarTema(track.uri);
    });

    resultados.appendChild(div);
  });
}

// ---- AGREGAR TEMA A LA COLA ----
async function agregarTema(uri) {
  const resp = await fetch("https://otro-tema-free.onrender.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ trackUri: uri })
  });

  const data = await resp.json();

  if (resp.ok) {
    alert("Tema agregado a la cola 🎵");
  } else {
    alert("Error al agregar tema: " + data.error);
  }
}

// ---- EVENTO DE BUSCAR ----
btn.addEventListener("click", buscarCanciones);

input.addEventListener("keypress", e => {
  if (e.key === "Enter") buscarCanciones();
});
