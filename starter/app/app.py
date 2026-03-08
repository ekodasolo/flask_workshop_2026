from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

# CORS を設定する（全オリジン許可）
CORS(app)

# ============================================================
# TODO: Blueprint を登録する
# ============================================================
# 1. routes/books.py から books_bp をインポートする
# 2. routes/reviews.py から reviews_bp をインポートする
# 3. app.register_blueprint() で各 Blueprint を登録する
#    - url_prefix には '/api/v1' を指定する


# ============================================================
# TODO: エラーハンドラーを定義する
# ============================================================
# 1. @app.errorhandler(404) で 404 エラーハンドラーを作る
#    - {"error": "Not found"} を返す
# 2. @app.errorhandler(500) で 500 エラーハンドラーを作る
#    - {"error": "Internal server error"} を返す


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
