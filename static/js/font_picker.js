// based on the code from sdomi.pl

var default_font = "font_anonymous";

window.addEventListener("DOMContentLoaded", fontChangeListener);

function fontChangeListener() {
    // buttons
    const toggleButton = document.getElementById("toggle_button");
    const fontPickerSection = document.getElementById("font_picker_section");
    var font_anonymous = document.querySelector("#font_anonymous");
    var font_lato = document.querySelector("#font_lato");
    var font_lora = document.querySelector("#font_lora");
    var stylesheet = document.querySelector("#font_stylesheet");

    if (localStorage.preferred_font) {
        var preferred_font = localStorage.preferred_font;
    } else {
        var preferred_font = default_font;
    }

    changeFont(preferred_font);

    // TODO: use cookie/local storage to store preferred font 
    function changeFont(font) {
        switch (font) {
            case "font_anonymous":
                stylesheet.setAttribute("href", "/css/font_anonymous_pro.css");
                font_anonymous.checked = true;
                localStorage.preferred_font = "font_anonymous";
                break;
            case "font_lato":
                console.log(stylesheet);
                stylesheet.setAttribute("href", "/css/font_lato.css");
                font_lato.checked = true;
                localStorage.preferred_font = "font_lato";
                break;
            case "font_lora":
                stylesheet.setAttribute("href", "/css/font_lora.css");
                font_lora.checked = true;
                localStorage.preferred_font = "font_lora";
                break;
            case "font_anonymous":
            default:    // could just put the body for font_anonymous here
                stylesheet.setAttribute("href", "/css/font_anonymous_pro.css");
                font_anonymous.checked = true;
                localStorage.preferred_font = "font_anonymous";
                break;
        }
    }

    function changeHandler(e) {
        changeFont(e.target.id);
    }

    font_anonymous.addEventListener("change", changeHandler);
    font_lato.addEventListener("change", changeHandler);
    font_lora.addEventListener("change", changeHandler);


    // Toggle visibility of font picker
    toggleButton.addEventListener("click", function () {
        if (fontPickerSection.style.display === "none" || fontPickerSection.style.display === "") {
            fontPickerSection.style.display = "block";
            toggleButton.textContent = "Pick a Font ▲";
        } else {
            fontPickerSection.style.display = "none";
            toggleButton.textContent = "Pick a Font ▼";
        }
    });
}