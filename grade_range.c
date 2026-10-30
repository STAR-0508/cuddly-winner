#include <stdio.h>

int main(void)
{
    char grade;

    printf("请输入成绩等级(A/B/C/D): ");
    if (scanf(" %c", &grade) != 1) {
        printf("输入错误。\n");
        return 1;
    }

    switch (grade) {
    case 'A': case 'a':
        printf("A等：85分以上（85～100分）\n");
        break;
    case 'B': case 'b':
        printf("B等：70～84分\n");
        break;
    case 'C': case 'c':
        printf("C等：60～69分\n");
        break;
    case 'D': case 'd':
        printf("D等：60分以下\n");
        break;
    default:
        printf("无效的等级，请输入 A、B、C 或 D。\n");
        return 1;
    }

    return 0;
}
