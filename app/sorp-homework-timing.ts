export const homeworkMinimumMs = 15000;
export const homeworkMessages = [
  { title: "WHAT DID YOUR LAST PUBLISHED REPORT ALREADY SHOW?", copy: "We’re reviewing your latest Trustees’ Annual Report and accounts against SORP 2026 to see what your published reporting already demonstrates and where there may be gaps." },
  { title: "A LOOK BACK, NOT A VERDICT ON WHERE YOU ARE TODAY.", copy: "Your published report may be months old. Next, you’ll tell us what has changed and where things stand now." },
  { title: "WHY START WITH PUBLISHED EVIDENCE?", copy: "It gives us a consistent historical view before we add your current knowledge and context." },
  { title: "SORP IS THE REQUIREMENT.\nBETTER IMPACT IS THE OPPORTUNITY.", copy: "Good evidence should help trustees and managers make better decisions throughout the year, not just write the annual report." },
] as const;

export const homeworkMessageDuration = (message: typeof homeworkMessages[number]) =>
  Math.max(5000, Math.ceil(`${message.title} ${message.copy}`.split(/\s+/).length / 220 * 60000 + 1000));

export function homeworkMessageAt(elapsed: number) {
  const cycle = homeworkMessages.reduce((total, message) => total + homeworkMessageDuration(message), 0);
  let endAt = Math.floor(elapsed / cycle) * cycle;
  for (let index = 0; index < homeworkMessages.length; index++) {
    endAt += homeworkMessageDuration(homeworkMessages[index]);
    if (elapsed < endAt) return { index, endAt };
  }
  return { index: 0, endAt: endAt + homeworkMessageDuration(homeworkMessages[0]) };
}

// Complete the current sentence, without forcing a complete message cycle.
export function homeworkFinishDelay(elapsed: number) {
  return homeworkMessageAt(Math.max(homeworkMinimumMs, elapsed) - 1).endAt - elapsed;
}
