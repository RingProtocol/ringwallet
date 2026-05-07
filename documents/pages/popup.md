# Popup List Layout

## Frame-style

ActionSheet, popup from bottom, max height 2/3 screen-size.

## Component

Use the shared component `PopupListLayout` (`src/components/common/PopupListLayout.tsx`).
It wraps the content in a `TransactionSheet` with `variant="sheet"` and provides a standard header + scrollable list area.

## Title

- Reuse `TitleBar` (`src/components/common/TitleBar.tsx`) for the header.
- Do **not** pass `onBack`; `TitleBar` will render a left spacer so the title stays centered.
- Title text is passed via the `title` prop of `PopupListLayout`.

## Close

- Show an `×` close button on the **top-right of the pop-up window**.
- Do **not** show a text "Close" button.
- The close button is rendered inside `TitleBar` via the `right` prop.

## Additional style

1. The horizontal line (vertical center) of Title and Close should be the same.
2. The `×` close button uses `display: flex; align-items: center; justify-content: center` so the character sits exactly in the middle of its background box.
