from flask import Flask
from routes.books import books_bp
from routes.reviews import reviews_bp

app = Flask(__name__)

# BlueprintをFlaskアプリに登録する
app.register_blueprint(books_bp, url_prefix='/api/v1')
app.register_blueprint(reviews_bp, url_prefix='/api/v1')

# 404エラーハンドラーを登録する
# 500エラーハンドラーを登録する

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
