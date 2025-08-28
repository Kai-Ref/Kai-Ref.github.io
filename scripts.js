// Rotating text below name
const rotatingTexts = ["Problem Solver", "Leader", "Innovator", "Developer"];
let index = 0;
const rotatingElement = document.querySelector('.rotating-text');

setInterval(() => {
    index = (index + 1) % rotatingTexts.length;
    rotatingElement.textContent = rotatingTexts[index];
}, 2000);

// Contact form handling
document.getElementById('contact-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const name = this.name.value;
    const email = this.email.value;
    const message = this.message.value;

    console.log({ name, email, message });
    document.getElementById('form-response').textContent = "Thank you! Your message has been sent.";
    this.reset();
});
