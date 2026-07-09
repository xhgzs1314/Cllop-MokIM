<?php
$setting_mail_array = array( //邮箱配置
    'valid' => 0, //是否启用
    'smtp_host' => 'smtp.qq.com', //smtp服务器
    'smtp_port' => 465, //端口号,25|465
    'smtp_secure' => 'ssl', //允许 TLS 或者ssl协议
    'smtp_user' => '', //邮箱用户
    'smtp_pass' => '', //邮箱授权码
);
/**-----------------------------------------------*/
$index_array = array( //主体配置
    'title' => 'GMOK-在线聊天', //标题
    'beian' => 'xxx备xxxx号-1', //备案号
    'keyword' => 'GMOK', //关键字
    'call' => 'yh-gzs@vip.qq.com', //联系方式
);
/**------------------------------------------------ */
$cosforall_oss = array(
    'access_key' => '',
    'access_key_secret' => '',
    'bucket' => '',
    'endpoint' => '',
    'region' => '',
    'max_upload_size' => '50MB',
);
/**----------------------------------------------------- */
$MOKIM_GIFT_CONFIG = [
    1 => [
        'id' => 1,
        'name' => '红玫瑰',
        'description' => '永恒的爱情象征',
        'price' => 100,
        'intimacyValue' => 60,
        'icon' => '🌹',
        'hasAnimation' => true,
        'animationType' => 'hearts',
        'category' => 'flowers'
    ],
    2 => [
        'id' => 2,
        'name' => '钻石',
        'description' => '闪耀的永恒之约',
        'price' => 200,
        'intimacyValue' => 180,
        'icon' => '💎',
        'hasAnimation' => true,
        'animationType' => 'sparkle',
        'category' => 'luxury'
    ],
    3 => [
        'id' => 3,
        'name' => '蛋糕',
        'description' => '甜蜜的祝福',
        'price' => 50,
        'intimacyValue' => 40,
        'icon' => '🎂',
        'hasAnimation' => true,
        'animationType' => 'cake',
        'category' => 'daily'
    ],
    4 => [
        'id' => 4,
        'name' => '庆祝礼炮',
        'description' => '欢乐的陪伴',
        'price' => 30,
        'intimacyValue' => 20,
        'icon' => '🎈',
        'hasAnimation' => true,
        'animationType' => 'celebration',
        'category' => 'daily'
    ],
    5 => [
        'id' => 5,
        'name' => '烟花',
        'description' => '盛大的烟花秀',
        'price' => 300,
        'intimacyValue' => 250,
        'icon' => '🎇',
        'hasAnimation' => true,
        'animationType' => 'fireworks',
        'category' => 'daily'
    ],
];
