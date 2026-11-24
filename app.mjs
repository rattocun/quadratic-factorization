import { drawFactor, expand, formatPolynomial, parseAnswer } from "./quiz.mjs";

const equation = document.querySelector("#equation");
const generate = document.querySelector("#generate");
const answerForm = document.querySelector("#answer-form");
const answer = document.querySelector("#answer");
const check = document.querySelector("#check");
const feedback = document.querySelector("#feedback");
const rangeInputs = [...document.querySelectorAll(".range-table input")];
let question = null;

function showFeedback(message = "", state = "") {
  feedback.dataset.state = state;
  feedback.textContent = message;
}

function readRange(coefficient) {
  const minInput = document.querySelector(`#${coefficient}-min`);
  const maxInput = document.querySelector(`#${coefficient}-max`);
  for (const input of [minInput, maxInput]) {
    if (!/^[+-]?\d+$/.test(input.value)) {
      input.setAttribute("aria-invalid", "true");
      throw new Error(`Enter integer bounds for ${coefficient}.`);
    }
  }
  const min = BigInt(minInput.value);
  const max = BigInt(maxInput.value);
  if (min > max) {
    minInput.setAttribute("aria-invalid", "true");
    maxInput.setAttribute("aria-invalid", "true");
    throw new Error(`The minimum for ${coefficient} must be at most its maximum.`);
  }
  return [min, max];
}

async function generateQuestion(focusAnswer = false) {
  generate.disabled = true;
  check.disabled = true;
  showFeedback("Generating…", "working");
  try {
    const [aRange, bRange, cRange, dRange] = ["a", "b", "c", "d"].map(readRange);
    const [a, b] = await drawFactor(aRange, bRange, "a and b");
    const [c, d] = await drawFactor(cRange, dRange, "c and d");
    const [p, q, r] = expand(a, b, c, d);
    question = {
      coefficients: [p, q, r],
      solution: `(${formatPolynomial([a, "x"], [b, ""])})(${formatPolynomial([c, "x"], [d, ""])})`,
    };
    equation.textContent = formatPolynomial([p, "x²"], [q, "x"], [r, ""]);
    answer.value = "";
    answer.removeAttribute("aria-invalid");
    showFeedback();
    if (focusAnswer) answer.focus();
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    generate.disabled = false;
    check.disabled = question === null;
  }
}

generate.addEventListener("click", () => generateQuestion(true));

answerForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!question || check.disabled) return;

  let coefficients;
  try {
    if (!answer.value.trim()) throw new Error("Enter your factorization first.");
    coefficients = expand(...parseAnswer(answer.value));
  } catch (error) {
    answer.setAttribute("aria-invalid", "true");
    showFeedback(error.message, "error");
    answer.focus();
    return;
  }

  if (coefficients.every((value, index) => value === question.coefficients[index])) {
    showFeedback("Correct!", "success");
  } else {
    showFeedback(`Incorrect. One correct answer is ${question.solution}.`, "error");
  }
});

answer.addEventListener("input", () => {
  answer.removeAttribute("aria-invalid");
  if (!generate.disabled) showFeedback();
});

for (const input of rangeInputs) {
  input.addEventListener("input", () => input.removeAttribute("aria-invalid"));
}

generateQuestion();
