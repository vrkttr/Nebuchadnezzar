<?php

function appearanceOptions(): array
{
    return [
        'skin' => [
            'label' => 'skin',
            'items' => [
                [null, '#d9b394'],
                [null, '#efd2b8'],
                [null, '#c79b7c'],
                [null, '#a87c5c'],
                [null, '#7a5640'],
                [null, '#4f3626'],
            ],
        ],
        'hair_style' => [
            'label' => 'hair_style',
            'items' => [
                [null, null],
                [null, null],
                [null, null],
                [null, null],
                [null, null],
            ],
        ],
        'hair_color' => [
            'label' => 'hair_color',
            'items' => [
                [null, '#3a2c22'],
                [null, '#16120e'],
                [null, '#6a4a2c'],
                [null, '#b89a5a'],
                [null, '#7a3a1e'],
                [null, '#8a8a84'],
            ],
        ],
        'top' => [
            'label' => 'top',
            'items' => [
                [null, '#4f6272'],
                [null, '#5a6a3c'],
                [null, '#7a4a3a'],
                [null, '#7a6a4a'],
                [null, '#5a5a58'],
                [null, '#4a3a2c'],
            ],
        ],
        'pants' => [
            'label' => 'pants',
            'items' => [
                [null, '#3c3a34'],
                [null, '#2e2c28'],
                [null, '#4a4234'],
                [null, '#3a4452'],
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
        echo '<fieldset class="portal-options"><legend class="nu-label">' . th('appearance.group.' . $group['label']) . '</legend><div class="portal-swatches">';

        foreach ($group['items'] as $index => [, $color]) {
            $checked = ($selected[$key] ?? 0) === $index ? ' checked' : '';
            $title = th('appearance.' . $key . '.' . $index);
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
