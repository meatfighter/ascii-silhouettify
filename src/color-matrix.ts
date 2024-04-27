import * as fs from 'fs';

// Function to generate the ANSI color string for a given color code
function getColorCode(colorCode: number): string {
    return `\x1b[38;5;${colorCode}m█\x1b[0m`;
}

// Function to generate the matrix string with all 256 ANSI colors
function generateColorMatrix(): string {
    let matrix = "";
    for (let i = 0; i < 256; i++) {
        // Append the color block
        matrix += getColorCode(i);
        // Add a new line every 16 colors to form a 16x16 matrix
        if ((i + 1) % 16 === 0) {
            matrix += '\n';
        }
    }
    return matrix;
}

// Write the color matrix to a text file
const colorMatrix = generateColorMatrix();
fs.writeFile('ansiColorMatrix.txt', colorMatrix, (err) => {
    if (err) {
        console.error("Failed to write to file:", err);
    } else {
        console.log("Color matrix file created successfully.");
    }
});