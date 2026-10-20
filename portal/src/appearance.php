<?php

function appearanceOptions(): array
{
    return [
        'skin' => [
            'label' => 'Hautton',
            'items' => [
                ['Hellbraun', '#d9b394'],
                ['Hell', '#efd2b8'],
                ['Beige', '#c79b7c'],
                ['Mittel', '#a87c5c'],
                ['Dunkel', '#7a5640'],
                ['Sehr dunkel', '#4f3626'],
            ],
        ],
        'hair_style' => [
            'label' => 'Frisur',
            'items' => [
                ['Kurz', null],
                ['Glatze', null],
                ['Lang', null],
                ['Kopftuch', null],
                ['Mütze', null],
            ],
        ],
        'hair_color' => [
            'label' => 'Haarfarbe',
            'items' => [
                ['Dunkelbraun', '#3a2c22'],
                ['Schwarz', '#16120e'],
                ['Braun', '#6a4a2c'],
                ['Blond', '#b89a5a'],
                ['Rotbraun', '#7a3a1e'],
                ['Grau', '#8a8a84'],
            ],
        ],
        'top' => [
            'label' => 'Oberteil',
            'items' => [
                ['Stahlblau', '#4f6272'],
                ['Oliv', '#5a6a3c'],
                ['Rostrot', '#7a4a3a'],
                ['Khaki', '#7a6a4a'],
                ['Grau', '#5a5a58'],
                ['Dunkelbraun', '#4a3a2c'],
            ],
        ],
        'pants' => [
            'label' => 'Hose',
            'items' => [
                ['Anthrazit', '#3c3a34'],
                ['Schwarz', '#2e2c28'],
                ['Braun', '#4a4234'],
                ['Dunkelblau', '#3a4452'],
            ],
        ],
    ];
}

function readAppearance(array $source): array
{
    $values = [];

    foreach (appearanceOptions() as $key => $group) {
        $value = filter_var($source[$key] ?? 0, FILTER_VALIDATE_INT);
        $values[$key] = ($value !== false && $value >= 0 && $value < count($group['items'])) ? $value : 0;
    }

    return $values;
}

function renderAppearanceFields(array $selected): void
{
    foreach (appearanceOptions() as $key => $group) {
        echo '<fieldset class="portal-options"><legend class="nu-label">' . htmlspecialchars($group['label']) . '</legend><div class="portal-swatches">';

        foreach ($group['items'] as $index => [$label, $color]) {
            $checked = ($selected[$key] ?? 0) === $index ? ' checked' : '';
            $title = htmlspecialchars($label);
            echo '<label class="portal-swatch" title="' . $title . '"><input type="radio" name="' . $key . '" value="' . $index . '"' . $checked . '>';

            if ($color !== null) {
                echo '<span class="portal-swatch-face" style="background:' . $color . '"></span>';
            } else {
                echo '<span class="portal-swatch-face is-text">' . $title . '</span>';
            }

            echo '</label>';
        }

        echo '</div></fieldset>';
    }
}

function appearanceHash(array $values): string
{
    return implode(',', [
        $values['skin'],
        $values['hair_style'],
        $values['hair_color'],
        $values['top'],
        $values['pants'],
    ]);
}
