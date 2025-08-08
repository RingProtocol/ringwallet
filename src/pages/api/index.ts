import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    res.status(200).json({
        message: 'API 路由已成功创建',
        endpoints: [
            '/api/create - 创建',
            // 可以在这里添加更多端点说明
        ]
    });
}
