# Page Style Description

0. Full-screen mode; the interface is divided into Header + Content.
1. Header bar: @TitleBar.tsx, height: 48px (6px top padding + 34px content + 8px bottom padding, plus 1px border-bottom).
   1.1 A "Back button" in the top-left corner of the header; clicking it exits the Page.
2. Content occupies the remaining area.
   2.1 If content is slow to load, display the Loading component first.
   2.2 If content encounters an error, display the ErrorPrompt component first.
