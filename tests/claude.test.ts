import { describe, it, expect } from 'vitest';
import { Claude } from '../server/claude';

const validate = (Claude as any).validateWorkflowJson as (json: any) => boolean;

describe('validateWorkflowJson', () => {
  it('returns true for valid workflow JSON', () => {
    const valid = {
      title: 'Workflow',
      start_event: 'start',
      end_event: 'end',
      steps: [],
      people: [],
      systems: [],
      pain_points: []
    };
    expect(validate(valid)).toBe(true);
  });

  it('returns false when required field is missing', () => {
    const missing = {
      start_event: 'start',
      end_event: 'end',
      steps: [],
      people: [],
      systems: [],
      pain_points: []
    };
    expect(validate(missing)).toBe(false);
  });

  it('returns false when field types are incorrect', () => {
    const wrongType = {
      title: 'Workflow',
      start_event: 'start',
      end_event: 'end',
      steps: {},
      people: [],
      systems: [],
      pain_points: []
    } as any;
    expect(validate(wrongType)).toBe(false);
  });
});
