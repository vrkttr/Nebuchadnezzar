<?php

const CHARACTER_CLASSES = ['soldier', 'butcher', 'builder', 'medic', 'scout'];

function isValidCharacterClass(?string $classId): bool
{
    return $classId !== null && in_array($classId, CHARACTER_CLASSES, true);
}

function renderClassFields(?string $selected): void
{
    echo '<fieldset class="portal-options"><legend class="nu-label">' . th('class.group') . '</legend><div class="portal-classes">';

    foreach (CHARACTER_CLASSES as $classId) {
        $checked = $selected === $classId ? ' checked' : '';
        echo '<label class="portal-class"><input type="radio" name="class_id" value="' . $classId . '" required' . $checked . '>';
        echo '<span class="portal-class-name">' . th('class.' . $classId . '.name') . '</span>';
        echo '<span class="portal-class-text">' . th('class.' . $classId . '.description') . '</span>';
        echo '<span class="portal-class-bonus">' . th('class.' . $classId . '.bonus') . '</span>';
        echo '</label>';
    }

    echo '</div></fieldset>';
}
