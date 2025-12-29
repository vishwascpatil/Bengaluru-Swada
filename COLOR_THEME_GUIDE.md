# Color Theme System - Quick Reference

## How to Change the Theme

All colors in the app are now controlled by CSS variables defined in `src/styles.scss`. 

To change the entire color theme, simply edit the `--primary-color` variable in the `:root` section of `src/styles.scss`:

```scss
:root {
    /* Primary Color Theme - Change this to explore different colors */
    --primary-color: #10B981;  /* ← Change this value */
    --primary-active: #059669;
    --primary-light: #E0F7F4;
    --primary-lighter: #D4F0EA;
    /* ... rest of variables */
}
```

## Available Theme Colors to Try

| Theme | Primary Color | Active Color | Light Variant |
|-------|--------------|-------------|---------------|
| **Green** (Current) | `#10B981` | `#059669` | `#E0F7F4` |
| **Blue** | `#007AFF` | `#0051D5` | `#E8F4FF` |
| **Red** | `#FF3B30` | `#CC2F26` | `#FFE8E6` |
| **Orange** | `#FF9500` | `#E68100` | `#FFF4E5` |
| **Purple** | `#AF52DE` | `#9340CC` | `#F5E6FF` |
| **Pink** | `#FF2D55` | `#E60043` | `#FFE8F0` |
| **Teal** | `#00C7BE` | `#00A9A0` | `#E0F8F6` |

## How to Use (Example: Change to Blue Theme)

1. Open `src/styles.scss`
2. Find the `:root` section
3. Update the color variables:

```scss
:root {
    --primary-color: #007AFF;        /* Blue */
    --primary-active: #0051D5;       /* Dark Blue */
    --primary-light: #E8F4FF;        /* Light Blue */
    --primary-lighter: #D4EDFF;      /* Lighter Blue */
    --primary-shadow: rgba(0, 122, 255, 0.3);
    --primary-shadow-sm: rgba(0, 122, 255, 0.15);
    --primary-shadow-xs: rgba(0, 122, 255, 0.1);
    --primary-tint: rgba(0, 122, 255, 0.2);
    --primary-border: #99CCFF;
}
```

4. Save the file
5. The app will automatically update everywhere!

## Where Colors Are Used

- ✅ Buttons (primary, active states)
- ✅ Price tags
- ✅ Location icons
- ✅ Like/bookmark buttons
- ✅ Search filters
- ✅ OTP verification elements
- ✅ Upload section
- ✅ Navigation indicators
- ✅ Shadows and glows
- ✅ Borders and backgrounds

## CSS Variables Reference

| Variable | Purpose |
|----------|---------|
| `--primary-color` | Main brand color for buttons, icons, active states |
| `--primary-active` | Darker shade for hover/active states |
| `--primary-light` | Light background for upload section |
| `--primary-lighter` | Very light background for active states |
| `--primary-shadow` | Shadow for buttons (30% opacity) |
| `--primary-shadow-sm` | Subtle shadow for inputs (15% opacity) |
| `--primary-shadow-xs` | Very subtle shadow for backgrounds (10% opacity) |
| `--primary-tint` | Tinted background for active buttons (20% opacity) |
| `--primary-border` | Border color for dashed borders |

## Tips for Creating Custom Colors

When choosing new colors:
1. Use a complementary shade (20-30% darker) for `--primary-active`
2. Keep opacity levels consistent:
   - `--primary-shadow`: 30% opacity
   - `--primary-shadow-sm`: 15% opacity
   - `--primary-shadow-xs`: 10% opacity
   - `--primary-tint`: 20% opacity
3. Test on light backgrounds to ensure contrast

## If You Need Fine-Tuning

Some specific overrides remain for semantic reasons:
- Heart icon (like button): `#ff4757` (Red) - intentionally kept red for user recognition
- Delete/error icons: `#FF3B30` - kept red for semantic meaning
- Privacy line accent: Uses primary color

To change these, edit the specific component SCSS files.
