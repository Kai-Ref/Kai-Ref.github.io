// Simple contact form handling
document.getElementById('contact-form').addEventListener('submit', function (e) {
    e.preventDefault();
    const name = this.name.value;
    const email = this.email.value;
    const message = this.message.value;

    // Here you can integrate with email API like EmailJS or your backend
    console.log({ name, email, message });

    document.getElementById('form-response').textContent = "Thank you! Your message has been sent.";
    this.reset();
});
