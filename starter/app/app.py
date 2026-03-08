from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# .env ファイルから環境変数を読み込む
load_dotenv()

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


# 404 エラーハンドラー
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404


# 500 エラーハンドラー
@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
