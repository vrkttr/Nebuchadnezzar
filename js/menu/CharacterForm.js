import { t } from '../i18n/I18n.js';
import { APPEARANCE_OPTIONS } from '../entities/AppearanceOptions.js';
import { el } from '../utils/Dom.js';

export const CLASS_IDS = ['soldier', 'butcher', 'builder', 'medic', 'scout'];
const NAME_MAX = 32;

const hex = (value) => `#${value.toString(16).padStart(6, '0')}`;

const GROUPS = [
  { key: 'skin', colors: APPEARANCE_OPTIONS.skin.map(hex) },
  { key: 'hair_style', colors: APPEARANCE_OPTIONS.hairStyle.map(() => null) },
  { key: 'hair_color', colors: APPEARANCE_OPTIONS.hairColor.map(hex) },
  { key: 'top', colors: APPEARANCE_OPTIONS.top.map(hex) },
  { key: 'pants', colors: APPEARANCE_OPTIONS.pants.map(hex) },
];

export function classFields(selected, onChange) {
  const inputs = CLASS_IDS.map((classId) =>
    el('input', { type: 'radio', name: 'class_id', value: classId, checked: selected === classId })
  );
  inputs.forEach((input) => input.addEventListener('change', () => onChange?.(input.value)));

  return el(
    'fieldset',
    { class: 'menu-options' },
    el('legend', { class: 'nu-label', text: t('class.group') }),
    el(
      'div',
      { class: 'menu-classes' },
      CLASS_IDS.map((classId, index) =>
        el(
          'label',
          { class: 'menu-class' },
          inputs[index],
          el('span', { class: 'menu-class-name', text: t(`class.${classId}.name`) }),
          el('span', { class: 'menu-class-text', text: t(`class.${classId}.description`) }),
          el('span', { class: 'menu-class-bonus', text: t(`class.${classId}.bonus`) })
        )
      )
    )
  );
}

export function createCharacterForm({ onPreview, onSubmit }) {
  const values = { skin: 0, hair_style: 0, hair_color: 0, top: 0, pants: 0 };
  const message = el('p', { class: 'nu-message', hidden: true });
  const name = el('input', { class: 'nu-input', type: 'text', maxlength: NAME_MAX, autocomplete: 'off', required: true });
  let classId = null;

  function preview() {
    onPreview(GROUPS.map((group) => values[group.key]));
  }

  const appearance = GROUPS.map((group) =>
    el(
      'fieldset',
      { class: 'menu-options' },
      el('legend', { class: 'nu-label', text: t(`appearance.group.${group.key}`) }),
      el(
        'div',
        { class: 'menu-swatches' },
        group.colors.map((color, index) => {
          const title = t(`appearance.${group.key}.${index}`);
          const input = el('input', { type: 'radio', name: group.key, value: index, checked: index === 0 });
          input.addEventListener('change', () => {
            values[group.key] = index;
            preview();
          });
          return el(
            'label',
            { class: 'menu-swatch', title },
            input,
            color ? el('span', { class: 'menu-swatch-face', style: `background:${color}` }) : el('span', { class: 'menu-swatch-face is-text', text: title })
          );
        })
      )
    )
  );

  const button = el('button', { class: 'nu-button', type: 'submit', text: t('character.create') });

  const element = el(
    'form',
    { class: 'menu-form', autocomplete: 'off' },
    message,
    el('label', { class: 'menu-field' }, el('span', { class: 'nu-label', text: t('character.name') }), name),
    classFields(null, (value) => {
      classId = value;
    }),
    appearance,
    el('p', { class: 'menu-hint', text: t('character.lockWarning') }),
    el('div', { class: 'menu-actions' }, button)
  );

  element.addEventListener('submit', async (event) => {
    event.preventDefault();
    button.disabled = true;
    const outcome = await onSubmit({ name: name.value, classId, appearance: { ...values } });
    button.disabled = false;
    if (!outcome.ok) {
      message.textContent = outcome.text;
      message.hidden = false;
    }
  });

  preview();
  return { element, focus: () => name.focus() };
}
