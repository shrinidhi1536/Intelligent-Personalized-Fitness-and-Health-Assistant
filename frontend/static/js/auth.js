import { api, showToast } from "./api.js";

export function initAuth(onSuccess) {
  const modal = document.getElementById("authModal");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const forgotForm = document.getElementById("forgotForm");
  const resetForm = document.getElementById("resetForm");

  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");
  const forgotLink = document.getElementById("forgotPasswordLink");
  const backToLoginLinks = document.querySelectorAll(".backToLogin");

  function showView(viewName) {
    loginForm.style.display = "none";
    registerForm.style.display = "none";
    forgotForm.style.display = "none";
    resetForm.style.display = "none";
    tabLogin.classList.remove("active");
    tabRegister.classList.remove("active");

    if (viewName === "login") {
      loginForm.style.display = "block";
      tabLogin.classList.add("active");
    } else if (viewName === "register") {
      registerForm.style.display = "block";
      tabRegister.classList.add("active");
    } else if (viewName === "forgot") {
      forgotForm.style.display = "block";
    } else if (viewName === "reset") {
      resetForm.style.display = "block";
    }
  }

  if (tabLogin) tabLogin.onclick = () => showView("login");
  if (tabRegister) tabRegister.onclick = () => showView("register");
  if (forgotLink) forgotLink.onclick = () => showView("forgot");
  backToLoginLinks.forEach(btn => btn.onclick = () => showView("login"));

  // Check URL query / hash for reset token
  const hash = window.location.hash;
  if (hash.includes("token=")) {
    const token = hash.split("token=")[1].split("&")[0];
    const resetTokenInput = document.getElementById("resetTokenInput");
    if (resetTokenInput) resetTokenInput.value = token;
    modal.classList.add("open");
    showView("reset");
  }

  // Handle Login Submit
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    try {
      const res = await api.post("/api/auth/login", { email, password });
      api.setAuth(res.token, res.user);
      showToast("Signed in successfully!", "success");
      modal.classList.remove("open");
      if (typeof onSuccess === "function") {
        await onSuccess(res.user, false);
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Handle Register Submit
  registerForm.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regConfirm").value;

    if (password !== confirm) {
      showToast("Passwords do not match!", "error");
      return;
    }

    try {
      const res = await api.post("/api/auth/register", {
        name, email, password, confirm_password: confirm
      });
      api.setAuth(res.token, res.user);
      showToast(`Welcome, ${res.user.name}! Starting your personalized assessment...`, "success");
      modal.classList.remove("open");
      if (typeof onSuccess === "function") {
        await onSuccess(res.user, true);
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Handle Forgot Password Submit
  forgotForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value;
    try {
      const res = await api.post("/api/auth/forgot-password", { email });
      showToast(res.message, "success");
      const devNotice = document.getElementById("forgotDevNotice");
      if (devNotice && res.reset_link) {
        devNotice.innerHTML = `
          <div style="margin-top: 14px; padding: 12px; border-radius: 8px; background: #ecfdf5; border: 1px solid #a7f3d0; font-size: 12px; color: #065f46;">
            <strong>Secure Reset Link Generated:</strong><br/>
            <a href="${res.reset_link}" style="color: #059669; word-break: break-all; font-weight: 700;">Click Here to Reset Password</a>
          </div>
        `;
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Handle Reset Password Submit
  resetForm.onsubmit = async (e) => {
    e.preventDefault();
    const token = document.getElementById("resetTokenInput").value;
    const new_password = document.getElementById("resetNewPassword").value;
    const confirm_password = document.getElementById("resetConfirmPassword").value;

    try {
      const res = await api.post("/api/auth/reset-password", {
        token, new_password, confirm_password
      });
      showToast(res.message, "success");
      showView("login");
    } catch (err) {
      showToast(err.message, "error");
    }
  };
}
