const supabase = require("./supabase");
const displayNote = document.getElementById("displayNote");
const noteInput = document.getElementById("noteInput");
const saveBtn = document.getElementById("saveBtn");
const clickSound = new Audio("pop_sound.mp3");
const petClickSound = new Audio("meow.mp3");


// CHANGE THIS ON EACH PERSON'S APP
const MY_ID = "min";
const PARTNER_ID = "diana";

const pet = document.getElementById("pet");
pet.addEventListener("click", () => {
  petClickSound.currentTime = 0;
  petClickSound.play();
});

async function updateNote() {

  const content = noteInput.value;
  await supabase
    .from("notes")
    .upsert({
      user_id: MY_ID,
      content: content,
    });

  noteInput.value = "";
  clickSound.play();
}


async function loadPartnerNote() {

  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", PARTNER_ID)
    .single();

  if (data) {
displayNote.innerHTML = `
  <div>
    <div>${data.content}</div>
    <small>
      ${new Date().toLocaleTimeString()}
    </small>
  </div>
`;
  }
}

saveBtn.addEventListener(
  "click",
  updateNote
);



supabase
  .channel("notes-live")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "notes",
    },
    (payload) => {

      if (
        payload.new.user_id === PARTNER_ID
      ) {
        displayNote.textContent =
          payload.new.content;
      }

    }
  )
  .subscribe();



loadPartnerNote();