// SUV – Supabase-Verbindung

const { createClient } = supabase;

const suvDb = createClient(
  window.SUV_CONFIG.SUPABASE_URL,
  window.SUV_CONFIG.SUPABASE_KEY
);

console.log("SUV: Supabase-Verbindung initialisiert.");
document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    const pageId = button.dataset.page;

    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });

    document.querySelectorAll(".page").forEach(page => {
      page.classList.remove("active");
    });

    button.classList.add("active");

    const selectedPage = document.getElementById(pageId);

    if (selectedPage) {
      selectedPage.classList.add("active");
    }

    const title = button.textContent.trim();
    document.getElementById("pageTitle").textContent = title;
  });
});
