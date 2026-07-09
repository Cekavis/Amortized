# Amortized

Amortized 是一个自托管的个人资产摊销记录应用，用于追踪购买成本、使用天数、转售价格，以及按分类汇总的每日平均成本。

## 本地开发

1. 安装依赖：

   ```sh
   pnpm install
   ```

2. 复制环境变量并按需修改：

   ```sh
   cp .env.example .env
   ```

3. 启动 PostgreSQL，执行迁移，然后启动开发服务器：

   ```sh
   pnpm prisma:dev
   pnpm dev
   ```

首次访问时，如果数据库中没有用户，应用会进入首个管理员创建流程。创建完成后，公开注册会关闭，后续用户由管理员在后台创建。

## Docker 部署

在本机可使用规格文档指定的命令：

```sh
/usr/local/bin/docker compose up -d --build
```

应用默认暴露在 `http://localhost:3000`。数据库数据保存在 Compose 命名卷 `postgres-data` 中，容器重启后会保留。

## 常用命令

```sh
pnpm test
pnpm build
pnpm prisma:migrate
pnpm db:seed
```

## 安全说明

- 不要提交 `.env` 或真实生产密钥。
- v1 只支持 CNY，金额在数据库中以整数分存储。
- 资产和分类查询都按当前登录用户在服务端过滤；管理员只管理账号，不默认查看其他用户资产。
