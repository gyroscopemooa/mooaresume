import { INTEREST_ITEMS, INTEREST_DIMENSIONS, scoreCareerInterest, type InterestAnswer } from '../../../src/domain/career-interest';
export { INTEREST_ITEMS, INTEREST_DIMENSIONS, scoreCareerInterest };
export type { InterestAnswer };
export const englishStatements: Record<string, readonly string[]> = {
  realistic: ['Using tools to fix a problem', 'Seeing a physical result take shape', 'Improving how a machine or process works', 'Working with tangible prototypes or equipment', 'Responding to unexpected problems on site'],
  investigative: ['Finding causes and patterns in data', 'Breaking a complex problem into logical parts', 'Learning a subject or technology in depth', 'Developing and testing a hypothesis', 'Drawing better conclusions from numbers and evidence'],
  artistic: ['Creating new ideas or forms of expression', 'Communicating through writing, images or content', 'Solving problems with more than one answer', 'Making an existing approach more engaging', 'Making work that reflects my perspective'],
  social: ['Explaining something so another person understands', 'Giving feedback that helps a teammate grow', 'Listening to needs and finding solutions', 'Connecting people so they can work together', 'Supporting someone through a change'],
  enterprising: ['Setting a goal and bringing people together', 'Persuading others of the value of an idea', 'Setting priorities and guiding decisions', 'Finding new opportunities or customers', 'Moving work forward through negotiation'],
  conventional: ['Organizing information without missing details', 'Managing standards and procedures accurately', 'Organizing schedules, budgets and records', 'Finding errors and checking quality', 'Organizing recurring work more efficiently'],
};
export const englishDimensions: Record<string, string> = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' };
export function questionEnglish(index: number) {
  const item = INTEREST_ITEMS[index];
  const dimensionIndex = INTEREST_ITEMS.slice(0, index).filter(other => other.dimension === item.dimension).length;
  return englishStatements[item.dimension][dimensionIndex];
}

