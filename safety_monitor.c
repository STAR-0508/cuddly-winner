#include <stdio.h>

int main(void)
{
    int level;

    printf("请输入企业安全级别系数(1～4): ");
    if (scanf("%d", &level) != 1) {
        printf("输入错误。\n");
        return 1;
    }

    switch (level) {
    case 1:
        printf("正常：安全状态正常，请保持。\n");
        break;
    case 2:
        printf("警告：出现异常，请注意监控！\n");
        break;
    case 3:
        printf("危险：处于危险状态，请立即排查！\n");
        break;
    case 4:
        printf("立即停产，危险操作-1!!\n");
        break;
    default:
        printf("无效的安全级别系数，请输入 1～4。\n");
        return 1;
    }

    return 0;
}
