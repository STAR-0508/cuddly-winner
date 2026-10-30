#include <stdio.h>

int main(void)
{
    int i;
    long result = 1;

    /* 循环求 1×2×3×…×6 */
    for (i = 1; i <= 6; i++) {
        result *= i;
        if (i < 6)
            printf("%d*", i);
        else
            printf("%d", i);
    }

    printf(" = %ld\n", result);
    return 0;
}
