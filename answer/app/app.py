from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from routes.books import books_bp
from routes.reviews import reviews_bp

# .env ファイルから環境変数を読み込む
load_dotenv()

app = Flask(__name__)

# CORS を設定する（全オリジン許可）
CORS(app)

# Blueprint を Flask アプリに登録する
app.register_blueprint(books_bp, url_prefix='/api/v1')
app.register_blueprint(reviews_bp, url_prefix='/api/v1')


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
