const supabase = require("./supabase");

const displayNote =
  document.getElementById("displayNote");

const noteInput =
  document.getElementById("noteInput");

const saveBtn =
  document.getElementById("saveBtn");


// IMPORTANT:
// CHANGE THIS ON EACH PERSON'S APP
const MY_ID = "min";

// WHOSE NOTE SHOULD DISPLAY?
const PARTNER_ID = "diana";



async function updateNote() {

  const content = noteInput.value;

  await supabase
    .from("notes")
    .upsert({
      user_id: MY_ID,
      content: content,
    });

  noteInput.value = "";
}



async function loadPartnerNote() {

  const { data } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", PARTNER_ID)
    .single();

  if (data) {
    displayNote.textContent =
      data.content;
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