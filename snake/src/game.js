class Snake {
    constructor(isAI = false) {
        this.segments = isAI ? [{x: 35, y: 10}] : [{x: 5, y: 10}]; // 根据类型设置初始位置
        this.direction = isAI ? 'left' : 'right'; // 初始方向
        this.nextDirection = isAI ? 'left' : 'right';
        this.growing = false;
        this.isAI = isAI;
        this.score = 0;
    }

    move() {
        this.direction = this.nextDirection;
        const head = {...this.segments[0]};

        switch(this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        this.segments.unshift(head);
        if (!this.growing) {
            this.segments.pop();
        }
        this.growing = false;
    }

    setDirection(direction) {
        const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
        if (opposites[this.direction] !== direction) {
            this.nextDirection = direction;
        }
    }

    grow() {
        this.growing = true;
        // 根据分数增加蛇的长度
        const extraLength = Math.floor(this.score / 50); // 每50分增加一个额外长度
        for (let i = 0; i < extraLength; i++) {
            const tail = this.segments[this.segments.length - 1];
            this.segments.push({...tail});
        }
    }

    checkCollision(width, height) {
        const head = this.segments[0];
        // 检查是否撞墙
        if (head.x < 0 || head.x >= width || head.y < 0 || head.y >= height) {
            return true;
        }
        // 检查是否撞到自己
        if (this.segments.slice(1).some(segment => 
            segment.x === head.x && segment.y === head.y
        )) {
            return true;
        }
        return false;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.canvas.width = 800;  // 设置画布宽度
        this.canvas.height = 600; // 设置画布高度
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20; // 每个网格的大小
        this.width = this.canvas.width / this.gridSize;
        this.height = this.canvas.height / this.gridSize;
        
        this.snake = new Snake(false);
        this.aiSnake = new Snake(true);
        this.food = this.generateFood();
        this.paused = false;
        this.gameOver = false;
        
        this.bindControls();
        this.setupGameControls();
    }

    generateFood() {
        const foodTypes = [
            {score: 10, color: '#ff6b6b'},
            {score: 50, color: '#ff4444'},
            {score: 100, color: '#ff0000', moving: true}
        ];
        const foods = [];
        for (let i = 0; i < foodTypes.length; i++) {
            let food;
            do {
                food = {
                    x: Math.floor(Math.random() * this.width),
                    y: Math.floor(Math.random() * this.height),
                    type: foodTypes[i]
                };
            } while (this.snake.segments.some(segment => segment.x === food.x && segment.y === food.y));
            foods.push(food);
        }
        return foods;
    }

    update() {
        if (this.gameOver || this.paused) return;

        // 更新蛇的位置
        this.snake.move();
        this.moveAISnake(); // AI决策
        this.aiSnake.move();

        // 检查玩家蛇碰撞
        if (this.snake.checkCollision(this.width, this.height)) {
            this.gameOver = true;
            clearInterval(this.gameLoop);
            this.gameLoop = null;
            alert(`游戏结束！\n玩家得分：${this.snake.score}\nAI得分：${this.aiSnake.score}`);
            return;
        }

        // 检查AI蛇碰撞
        if (this.aiSnake.checkCollision(this.width, this.height)) {
            // 重置AI蛇
            this.aiSnake = new Snake(true);
            this.aiSnake.score = 0;
            this.updateScore();
        }

        // 检查蛇之间的碰撞
        const collisionResult = this.checkSnakeCollision();
        if (collisionResult === 'player') {
            this.gameOver = true;
            clearInterval(this.gameLoop);
            this.gameLoop = null;
            alert(`游戏结束！\n玩家得分：${this.snake.score}\nAI得分：${this.aiSnake.score}`);
            return;
        } else if (collisionResult === 'ai') {
            // 重置AI蛇
            this.aiSnake = new Snake(true);
            this.aiSnake.score = 0;
            this.updateScore();
        }

        // 检查是否吃到食物
        for (let i = 0; i < this.food.length; i++) {
            const food = this.food[i];
            // 检查玩家蛇
            if (this.snake.segments[0].x === food.x && this.snake.segments[0].y === food.y) {
                this.snake.grow();
                this.snake.score += food.type.score;
                this.food.splice(i, 1);
                this.food.push(this.generateFood()[0]);
                this.updateScore();
                break;
            }
            // 检查AI蛇
            if (this.aiSnake.segments[0].x === food.x && this.aiSnake.segments[0].y === food.y) {
                this.aiSnake.grow();
                this.aiSnake.score += food.type.score;
                this.food.splice(i, 1);
                this.food.push(this.generateFood()[0]);
                this.updateScore();
                break;
            }
        }

        // 移动高分食物
        this.food.forEach(food => {
            if (food.type.moving) {
                const directions = ['up', 'down', 'left', 'right'];
                const direction = directions[Math.floor(Math.random() * directions.length)];
                switch(direction) {
                    case 'up': if (food.y > 0) food.y--; break;
                    case 'down': if (food.y < this.height - 1) food.y++; break;
                    case 'left': if (food.x > 0) food.x--; break;
                    case 'right': if (food.x < this.width - 1) food.x++; break;
                }
            }
        });

        // 绘制AI蛇
        this.aiSnake.segments.forEach((segment, index) => {
            // 为蛇头和蛇身设置不同的颜色
            let gradientColors;
            if (index === 0) { // 蛇头
                gradientColors = {
                    start: '#1976d2',
                    end: '#0d47a1'
                };
            } else { // 蛇身 - 使用蓝色系
                const shade = Math.sin(index * 0.2) * 20;
                gradientColors = {
                    start: `hsl(210, ${45 + shade}%, ${30 + shade}%)`,
                    end: `hsl(210, ${40 + shade}%, ${25 + shade}%)`
                };
            }

            const gradient = this.ctx.createLinearGradient(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                (segment.x + 1) * this.gridSize,
                (segment.y + 1) * this.gridSize
            );
            gradient.addColorStop(0, gradientColors.start);
            gradient.addColorStop(1, gradientColors.end);
            this.ctx.fillStyle = gradient;
            
            const size = this.gridSize - 2;
            const radius = index === 0 ? 8 : 6;
            const x = segment.x * this.gridSize + 1;
            const y = segment.y * this.gridSize + 1;
            
            // 绘制基本形状
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + size - radius, y);
            this.ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
            this.ctx.lineTo(x + size, y + size - radius);
            this.ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
            this.ctx.lineTo(x + radius, y + size);
            this.ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.fill();

            // 为每个段添加鳞片纹理
            this.ctx.strokeStyle = gradientColors.end;
            this.ctx.lineWidth = 0.5;
            const scaleSize = 3;
            const scaleOffset = 6;
            
            let scaleStartX = x + size/4;
            let scaleEndX = x + size*3/4;
            let scaleY = y + scaleOffset;
            
            if (index === 0) { // AI蛇头特殊处理
                // 绘制眼睛
                const eyeSize = 4;
                const eyeOffset = 6;
                const eyeY = y + eyeOffset;
                
                let leftEyeX, rightEyeX;
                switch(this.aiSnake.direction) {
                    case 'up':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'down':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'left':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + eyeOffset + eyeSize + 2;
                        break;
                    case 'right':
                        leftEyeX = x + size - eyeOffset - eyeSize - 2;
                        rightEyeX = x + size - eyeOffset;
                        break;
                }

                // 绘制眼睛
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();

                // 添加眼睛高光
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // 绘制鳞片
            for (let i = 0; i < 4; i++) {
                this.ctx.beginPath();
                this.ctx.arc(scaleStartX + (scaleEndX - scaleStartX) * (i/3),
                           scaleY + Math.sin(i * 0.5) * 2,
                           scaleSize/2, 0, Math.PI);
                this.ctx.stroke();
            }
        });

        // 更新画面
        this.draw();
    }

    updateScore() {
        document.getElementById('score').textContent = `得分 - 玩家: ${this.snake.score} | AI: ${this.aiSnake.score}`;
    }

    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格背景
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        for(let i = 0; i <= this.width; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.gridSize, 0);
            this.ctx.lineTo(i * this.gridSize, this.canvas.height);
            this.ctx.stroke();
        }
        for(let i = 0; i <= this.height; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.gridSize);
            this.ctx.lineTo(this.canvas.width, i * this.gridSize);
            this.ctx.stroke();
        }

        // 绘制蛇
        // 绘制玩家蛇
        this.snake.segments.forEach((segment, index) => {
            // 为蛇头和蛇身设置不同的颜色
            let gradientColors;
            if (index === 0) { // 蛇头
                gradientColors = {
                    start: '#2e7d32',
                    end: '#1b5e20'
                };
            } else { // 蛇身 - 使用更深的绿色
                const shade = Math.sin(index * 0.2) * 20; // 添加颜色变化
                gradientColors = {
                    start: `hsl(120, ${45 + shade}%, ${30 + shade}%)`,
                    end: `hsl(120, ${40 + shade}%, ${25 + shade}%)`
                };
            }

            const gradient = this.ctx.createLinearGradient(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                (segment.x + 1) * this.gridSize,
                (segment.y + 1) * this.gridSize
            );
            gradient.addColorStop(0, gradientColors.start);
            gradient.addColorStop(1, gradientColors.end);
            this.ctx.fillStyle = gradient;
            
            const size = this.gridSize - 2;
            const radius = index === 0 ? 8 : 6; // 增加圆角
            const x = segment.x * this.gridSize + 1;
            const y = segment.y * this.gridSize + 1;
            
            // 绘制基本形状
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + size - radius, y);
            this.ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
            this.ctx.lineTo(x + size, y + size - radius);
            this.ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
            this.ctx.lineTo(x + radius, y + size);
            this.ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.fill();

            // 为每个段添加鳞片纹理
            this.ctx.strokeStyle = gradientColors.end;
            this.ctx.lineWidth = 0.5;
            const scaleSize = 3;
            const scaleOffset = 6;
            
            // 根据方向调整鳞片位置
            let scaleStartX = x + size/4;
            let scaleEndX = x + size*3/4;
            let scaleY = y + scaleOffset;
            
            if (index === 0) { // 蛇头特殊处理
                // 绘制眼睛
                const eyeSize = 4;
                const eyeOffset = 6;
                const eyeY = y + eyeOffset;
                
                let leftEyeX, rightEyeX;
                switch(this.snake.direction) {
                    case 'up':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'down':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'left':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + eyeOffset + eyeSize + 2;
                        break;
                    case 'right':
                        leftEyeX = x + size - eyeOffset - eyeSize - 2;
                        rightEyeX = x + size - eyeOffset;
                        break;
                }

                // 绘制眼睛
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();

                // 添加眼睛高光
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // 绘制鳞片
            for (let i = 0; i < 4; i++) {
                this.ctx.beginPath();
                this.ctx.arc(scaleStartX + (scaleEndX - scaleStartX) * (i/3),
                           scaleY + Math.sin(i * 0.5) * 2,
                           scaleSize/2, 0, Math.PI);
                this.ctx.stroke();
            }
        });

        // 绘制AI蛇
        this.aiSnake.segments.forEach((segment, index) => {
            // 为蛇头和蛇身设置不同的颜色
            let gradientColors;
            if (index === 0) { // 蛇头
                gradientColors = {
                    start: '#1976d2',
                    end: '#0d47a1'
                };
            } else { // 蛇身 - 使用蓝色系
                const shade = Math.sin(index * 0.2) * 20;
                gradientColors = {
                    start: `hsl(210, ${45 + shade}%, ${30 + shade}%)`,
                    end: `hsl(210, ${40 + shade}%, ${25 + shade}%)`
                };
            }

            const gradient = this.ctx.createLinearGradient(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                (segment.x + 1) * this.gridSize,
                (segment.y + 1) * this.gridSize
            );
            gradient.addColorStop(0, gradientColors.start);
            gradient.addColorStop(1, gradientColors.end);
            this.ctx.fillStyle = gradient;
            
            const size = this.gridSize - 2;
            const radius = index === 0 ? 8 : 6;
            const x = segment.x * this.gridSize + 1;
            const y = segment.y * this.gridSize + 1;
            
            // 绘制基本形状
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + size - radius, y);
            this.ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
            this.ctx.lineTo(x + size, y + size - radius);
            this.ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
            this.ctx.lineTo(x + radius, y + size);
            this.ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.fill();

            // 为每个段添加鳞片纹理
            this.ctx.strokeStyle = gradientColors.end;
            this.ctx.lineWidth = 0.5;
            const scaleSize = 3;
            const scaleOffset = 6;
            
            let scaleStartX = x + size/4;
            let scaleEndX = x + size*3/4;
            let scaleY = y + scaleOffset;
            
            if (index === 0) { // AI蛇头特殊处理
                // 绘制眼睛
                const eyeSize = 4;
                const eyeOffset = 6;
                const eyeY = y + eyeOffset;
                
                let leftEyeX, rightEyeX;
                switch(this.aiSnake.direction) {
                    case 'up':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'down':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'left':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + eyeOffset + eyeSize + 2;
                        break;
                    case 'right':
                        leftEyeX = x + size - eyeOffset - eyeSize - 2;
                        rightEyeX = x + size - eyeOffset;
                        break;
                }

                // 绘制眼睛
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();

                // 添加眼睛高光
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // 绘制鳞片
            for (let i = 0; i < 4; i++) {
                this.ctx.beginPath();
                this.ctx.arc(scaleStartX + (scaleEndX - scaleStartX) * (i/3),
                           scaleY + Math.sin(i * 0.5) * 2,
                           scaleSize/2, 0, Math.PI);
                this.ctx.stroke();
            }
        });

        // 绘制食物
        this.food.forEach(food => {
            const foodSize = this.gridSize - 2;
            const foodX = food.x * this.gridSize + 1;
            const foodY = food.y * this.gridSize + 1;
            
            const gradient = this.ctx.createRadialGradient(
                foodX + foodSize/2,
                foodY + foodSize/2,
                0,
                foodX + foodSize/2,
                foodY + foodSize/2,
                foodSize/2
            );
            gradient.addColorStop(0, food.type.color);
            gradient.addColorStop(1, '#000');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(
                foodX + foodSize/2,
                foodY + foodSize/2,
                foodSize/2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        });

        // 绘制AI蛇
        this.aiSnake.segments.forEach((segment, index) => {
            // 为蛇头和蛇身设置不同的颜色
            let gradientColors;
            if (index === 0) { // 蛇头
                gradientColors = {
                    start: '#1976d2',
                    end: '#0d47a1'
                };
            } else { // 蛇身 - 使用蓝色系
                const shade = Math.sin(index * 0.2) * 20;
                gradientColors = {
                    start: `hsl(210, ${45 + shade}%, ${30 + shade}%)`,
                    end: `hsl(210, ${40 + shade}%, ${25 + shade}%)`
                };
            }

            const gradient = this.ctx.createLinearGradient(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                (segment.x + 1) * this.gridSize,
                (segment.y + 1) * this.gridSize
            );
            gradient.addColorStop(0, gradientColors.start);
            gradient.addColorStop(1, gradientColors.end);
            this.ctx.fillStyle = gradient;
            
            const size = this.gridSize - 2;
            const radius = index === 0 ? 8 : 6;
            const x = segment.x * this.gridSize + 1;
            const y = segment.y * this.gridSize + 1;
            
            // 绘制基本形状
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + size - radius, y);
            this.ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
            this.ctx.lineTo(x + size, y + size - radius);
            this.ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
            this.ctx.lineTo(x + radius, y + size);
            this.ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.fill();

            // 为每个段添加鳞片纹理
            this.ctx.strokeStyle = gradientColors.end;
            this.ctx.lineWidth = 0.5;
            const scaleSize = 3;
            const scaleOffset = 6;
            
            let scaleStartX = x + size/4;
            let scaleEndX = x + size*3/4;
            let scaleY = y + scaleOffset;
            
            if (index === 0) { // AI蛇头特殊处理
                // 绘制眼睛
                const eyeSize = 4;
                const eyeOffset = 6;
                const eyeY = y + eyeOffset;
                
                let leftEyeX, rightEyeX;
                switch(this.aiSnake.direction) {
                    case 'up':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'down':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'left':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + eyeOffset + eyeSize + 2;
                        break;
                    case 'right':
                        leftEyeX = x + size - eyeOffset - eyeSize - 2;
                        rightEyeX = x + size - eyeOffset;
                        break;
                }

                // 绘制眼睛
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();

                // 添加眼睛高光
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // 绘制鳞片
            for (let i = 0; i < 4; i++) {
                this.ctx.beginPath();
                this.ctx.arc(scaleStartX + (scaleEndX - scaleStartX) * (i/3),
                           scaleY + Math.sin(i * 0.5) * 2,
                           scaleSize/2, 0, Math.PI);
                this.ctx.stroke();
            }
        });
    }

    bindControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver) return;
            
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.snake.setDirection('up');
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.snake.setDirection('down');
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.snake.setDirection('left');
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.snake.setDirection('right');
                    break;
                case ' ':
                    this.togglePause();
                    break;
            }
        });

        // 绘制AI蛇
        this.aiSnake.segments.forEach((segment, index) => {
            // 为蛇头和蛇身设置不同的颜色
            let gradientColors;
            if (index === 0) { // 蛇头
                gradientColors = {
                    start: '#1976d2',
                    end: '#0d47a1'
                };
            } else { // 蛇身 - 使用蓝色系
                const shade = Math.sin(index * 0.2) * 20;
                gradientColors = {
                    start: `hsl(210, ${45 + shade}%, ${30 + shade}%)`,
                    end: `hsl(210, ${40 + shade}%, ${25 + shade}%)`
                };
            }

            const gradient = this.ctx.createLinearGradient(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                (segment.x + 1) * this.gridSize,
                (segment.y + 1) * this.gridSize
            );
            gradient.addColorStop(0, gradientColors.start);
            gradient.addColorStop(1, gradientColors.end);
            this.ctx.fillStyle = gradient;
            
            const size = this.gridSize - 2;
            const radius = index === 0 ? 8 : 6;
            const x = segment.x * this.gridSize + 1;
            const y = segment.y * this.gridSize + 1;
            
            // 绘制基本形状
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + size - radius, y);
            this.ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
            this.ctx.lineTo(x + size, y + size - radius);
            this.ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
            this.ctx.lineTo(x + radius, y + size);
            this.ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.fill();

            // 为每个段添加鳞片纹理
            this.ctx.strokeStyle = gradientColors.end;
            this.ctx.lineWidth = 0.5;
            const scaleSize = 3;
            const scaleOffset = 6;
            
            let scaleStartX = x + size/4;
            let scaleEndX = x + size*3/4;
            let scaleY = y + scaleOffset;
            
            if (index === 0) { // AI蛇头特殊处理
                // 绘制眼睛
                const eyeSize = 4;
                const eyeOffset = 6;
                const eyeY = y + eyeOffset;
                
                let leftEyeX, rightEyeX;
                switch(this.aiSnake.direction) {
                    case 'up':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'down':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'left':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + eyeOffset + eyeSize + 2;
                        break;
                    case 'right':
                        leftEyeX = x + size - eyeOffset - eyeSize - 2;
                        rightEyeX = x + size - eyeOffset;
                        break;
                }

                // 绘制眼睛
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();

                // 添加眼睛高光
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // 绘制鳞片
            for (let i = 0; i < 4; i++) {
                this.ctx.beginPath();
                this.ctx.arc(scaleStartX + (scaleEndX - scaleStartX) * (i/3),
                           scaleY + Math.sin(i * 0.5) * 2,
                           scaleSize/2, 0, Math.PI);
                this.ctx.stroke();
            }
        });
    }

    setupGameControls() {
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');

        if (!startBtn || !pauseBtn) {
            console.error('找不到游戏控制按钮');
            return;
        }

        startBtn.addEventListener('click', () => {
            if (this.gameOver) {
                this.resetGame();
            }
            this.startGame();
        });

        // 绘制AI蛇
        this.aiSnake.segments.forEach((segment, index) => {
            // 为蛇头和蛇身设置不同的颜色
            let gradientColors;
            if (index === 0) { // 蛇头
                gradientColors = {
                    start: '#1976d2',
                    end: '#0d47a1'
                };
            } else { // 蛇身 - 使用蓝色系
                const shade = Math.sin(index * 0.2) * 20;
                gradientColors = {
                    start: `hsl(210, ${45 + shade}%, ${30 + shade}%)`,
                    end: `hsl(210, ${40 + shade}%, ${25 + shade}%)`
                };
            }

            const gradient = this.ctx.createLinearGradient(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                (segment.x + 1) * this.gridSize,
                (segment.y + 1) * this.gridSize
            );
            gradient.addColorStop(0, gradientColors.start);
            gradient.addColorStop(1, gradientColors.end);
            this.ctx.fillStyle = gradient;
            
            const size = this.gridSize - 2;
            const radius = index === 0 ? 8 : 6;
            const x = segment.x * this.gridSize + 1;
            const y = segment.y * this.gridSize + 1;
            
            // 绘制基本形状
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + size - radius, y);
            this.ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
            this.ctx.lineTo(x + size, y + size - radius);
            this.ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
            this.ctx.lineTo(x + radius, y + size);
            this.ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.fill();

            // 为每个段添加鳞片纹理
            this.ctx.strokeStyle = gradientColors.end;
            this.ctx.lineWidth = 0.5;
            const scaleSize = 3;
            const scaleOffset = 6;
            
            let scaleStartX = x + size/4;
            let scaleEndX = x + size*3/4;
            let scaleY = y + scaleOffset;
            
            if (index === 0) { // AI蛇头特殊处理
                // 绘制眼睛
                const eyeSize = 4;
                const eyeOffset = 6;
                const eyeY = y + eyeOffset;
                
                let leftEyeX, rightEyeX;
                switch(this.aiSnake.direction) {
                    case 'up':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'down':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'left':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + eyeOffset + eyeSize + 2;
                        break;
                    case 'right':
                        leftEyeX = x + size - eyeOffset - eyeSize - 2;
                        rightEyeX = x + size - eyeOffset;
                        break;
                }

                // 绘制眼睛
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();

                // 添加眼睛高光
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // 绘制鳞片
            for (let i = 0; i < 4; i++) {
                this.ctx.beginPath();
                this.ctx.arc(scaleStartX + (scaleEndX - scaleStartX) * (i/3),
                           scaleY + Math.sin(i * 0.5) * 2,
                           scaleSize/2, 0, Math.PI);
                this.ctx.stroke();
            }
        });

        pauseBtn.addEventListener('click', () => {
            this.togglePause();
            pauseBtn.textContent = this.paused ? '继续' : '暂停';
        });

        // 绘制AI蛇
        this.aiSnake.segments.forEach((segment, index) => {
            // 为蛇头和蛇身设置不同的颜色
            let gradientColors;
            if (index === 0) { // 蛇头
                gradientColors = {
                    start: '#1976d2',
                    end: '#0d47a1'
                };
            } else { // 蛇身 - 使用蓝色系
                const shade = Math.sin(index * 0.2) * 20;
                gradientColors = {
                    start: `hsl(210, ${45 + shade}%, ${30 + shade}%)`,
                    end: `hsl(210, ${40 + shade}%, ${25 + shade}%)`
                };
            }

            const gradient = this.ctx.createLinearGradient(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                (segment.x + 1) * this.gridSize,
                (segment.y + 1) * this.gridSize
            );
            gradient.addColorStop(0, gradientColors.start);
            gradient.addColorStop(1, gradientColors.end);
            this.ctx.fillStyle = gradient;
            
            const size = this.gridSize - 2;
            const radius = index === 0 ? 8 : 6;
            const x = segment.x * this.gridSize + 1;
            const y = segment.y * this.gridSize + 1;
            
            // 绘制基本形状
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + size - radius, y);
            this.ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
            this.ctx.lineTo(x + size, y + size - radius);
            this.ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
            this.ctx.lineTo(x + radius, y + size);
            this.ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.fill();

            // 为每个段添加鳞片纹理
            this.ctx.strokeStyle = gradientColors.end;
            this.ctx.lineWidth = 0.5;
            const scaleSize = 3;
            const scaleOffset = 6;
            
            let scaleStartX = x + size/4;
            let scaleEndX = x + size*3/4;
            let scaleY = y + scaleOffset;
            
            if (index === 0) { // AI蛇头特殊处理
                // 绘制眼睛
                const eyeSize = 4;
                const eyeOffset = 6;
                const eyeY = y + eyeOffset;
                
                let leftEyeX, rightEyeX;
                switch(this.aiSnake.direction) {
                    case 'up':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'down':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'left':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + eyeOffset + eyeSize + 2;
                        break;
                    case 'right':
                        leftEyeX = x + size - eyeOffset - eyeSize - 2;
                        rightEyeX = x + size - eyeOffset;
                        break;
                }

                // 绘制眼睛
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();

                // 添加眼睛高光
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // 绘制鳞片
            for (let i = 0; i < 4; i++) {
                this.ctx.beginPath();
                this.ctx.arc(scaleStartX + (scaleEndX - scaleStartX) * (i/3),
                           scaleY + Math.sin(i * 0.5) * 2,
                           scaleSize/2, 0, Math.PI);
                this.ctx.stroke();
            }
        });

        // 初始化按钮状态
        startBtn.textContent = '开始游戏';
        pauseBtn.textContent = '暂停';
        console.log('游戏控制按钮设置完成');
    }

    togglePause() {
        this.paused = !this.paused;
        document.getElementById('pause-btn').textContent = this.paused ? '继续' : '暂停';
    }

    startGame() {
        // 确保在启动新游戏前清理旧的游戏循环
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }

        // 初始化游戏状态
        this.gameOver = false;
        this.paused = false;

        // 如果游戏已经结束，重置游戏状态
        if (this.snake.segments.length === 0) {
            this.resetGame();
        }
        
        // 更新按钮文本
        document.getElementById('start-btn').textContent = '重新开始';
        document.getElementById('pause-btn').textContent = '暂停';
        
        // 初始渲染
        this.draw();
        
        // 启动游戏循环
        const updateInterval = 150; // 调整更新间隔为150毫秒，使游戏更流畅
        this.gameLoop = setInterval(() => {
            if (!this.gameOver && !this.paused) {
                this.update();
            }
        }, updateInterval);
}

    resetGame() {
        this.snake = new Snake(false);
        this.aiSnake = new Snake(true);
        this.food = this.generateFood();
        this.gameOver = false;
        this.paused = false;
        this.updateScore();
        this.draw(); // 添加初始渲染
        
        // 重置按钮状态
        document.getElementById('start-btn').textContent = '开始游戏';
        document.getElementById('pause-btn').textContent = '暂停';
        
        // 如果存在旧的游戏循环，清除它
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
    }

    moveAISnake() {
        // 找到最近的食物
        let nearestFood = this.food[0];
        let minDistance = Infinity;
        
        this.food.forEach(food => {
            const distance = Math.abs(food.x - this.aiSnake.segments[0].x) + 
                           Math.abs(food.y - this.aiSnake.segments[0].y);
            if (distance < minDistance) {
                minDistance = distance;
                nearestFood = food;
            }
        });

        // 绘制AI蛇
        this.aiSnake.segments.forEach((segment, index) => {
            // 为蛇头和蛇身设置不同的颜色
            let gradientColors;
            if (index === 0) { // 蛇头
                gradientColors = {
                    start: '#1976d2',
                    end: '#0d47a1'
                };
            } else { // 蛇身 - 使用蓝色系
                const shade = Math.sin(index * 0.2) * 20;
                gradientColors = {
                    start: `hsl(210, ${45 + shade}%, ${30 + shade}%)`,
                    end: `hsl(210, ${40 + shade}%, ${25 + shade}%)`
                };
            }

            const gradient = this.ctx.createLinearGradient(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                (segment.x + 1) * this.gridSize,
                (segment.y + 1) * this.gridSize
            );
            gradient.addColorStop(0, gradientColors.start);
            gradient.addColorStop(1, gradientColors.end);
            this.ctx.fillStyle = gradient;
            
            const size = this.gridSize - 2;
            const radius = index === 0 ? 8 : 6;
            const x = segment.x * this.gridSize + 1;
            const y = segment.y * this.gridSize + 1;
            
            // 绘制基本形状
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + size - radius, y);
            this.ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
            this.ctx.lineTo(x + size, y + size - radius);
            this.ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
            this.ctx.lineTo(x + radius, y + size);
            this.ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.quadraticCurveTo(x, y, x + radius, y);
            this.ctx.fill();

            // 为每个段添加鳞片纹理
            this.ctx.strokeStyle = gradientColors.end;
            this.ctx.lineWidth = 0.5;
            const scaleSize = 3;
            const scaleOffset = 6;
            
            let scaleStartX = x + size/4;
            let scaleEndX = x + size*3/4;
            let scaleY = y + scaleOffset;
            
            if (index === 0) { // AI蛇头特殊处理
                // 绘制眼睛
                const eyeSize = 4;
                const eyeOffset = 6;
                const eyeY = y + eyeOffset;
                
                let leftEyeX, rightEyeX;
                switch(this.aiSnake.direction) {
                    case 'up':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'down':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + size - eyeOffset - eyeSize;
                        break;
                    case 'left':
                        leftEyeX = x + eyeOffset;
                        rightEyeX = x + eyeOffset + eyeSize + 2;
                        break;
                    case 'right':
                        leftEyeX = x + size - eyeOffset - eyeSize - 2;
                        rightEyeX = x + size - eyeOffset;
                        break;
                }

                // 绘制眼睛
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX, eyeY, eyeSize/2, 0, Math.PI * 2);
                this.ctx.fill();

                // 添加眼睛高光
                this.ctx.fillStyle = '#fff';
                this.ctx.beginPath();
                this.ctx.arc(leftEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.beginPath();
                this.ctx.arc(rightEyeX - 1, eyeY - 1, eyeSize/4, 0, Math.PI * 2);
                this.ctx.fill();
            }

            // 绘制鳞片
            for (let i = 0; i < 4; i++) {
                this.ctx.beginPath();
                this.ctx.arc(scaleStartX + (scaleEndX - scaleStartX) * (i/3),
                           scaleY + Math.sin(i * 0.5) * 2,
                           scaleSize/2, 0, Math.PI);
                this.ctx.stroke();
            }
        });

        // 决定移动方向
        const head = this.aiSnake.segments[0];
        const dx = nearestFood.x - head.x;
        const dy = nearestFood.y - head.y;

        // 优先选择距离食物最近的方向，同时避免碰撞
        const possibleDirections = [];
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) possibleDirections.push('right');
            if (dx < 0) possibleDirections.push('left');
            if (dy > 0) possibleDirections.push('down');
            if (dy < 0) possibleDirections.push('up');
        } else {
            if (dy > 0) possibleDirections.push('down');
            if (dy < 0) possibleDirections.push('up');
            if (dx > 0) possibleDirections.push('right');
            if (dx < 0) possibleDirections.push('left');
        }

        // 选择不会导致碰撞的方向
        for (const direction of possibleDirections) {
            const nextHead = {...head};
            switch(direction) {
                case 'up': nextHead.y--; break;
                case 'down': nextHead.y++; break;
                case 'left': nextHead.x--; break;
                case 'right': nextHead.x++; break;
            }

            // 检查是否会撞墙或撞到自己
            if (nextHead.x >= 0 && nextHead.x < this.width && 
                nextHead.y >= 0 && nextHead.y < this.height && 
                !this.aiSnake.segments.some(segment => 
                    segment.x === nextHead.x && segment.y === nextHead.y
                )) {
                this.aiSnake.setDirection(direction);
                break;
            }
        }
    }

    checkSnakeCollision() {
        const playerHead = this.snake.segments[0];
        const aiHead = this.aiSnake.segments[0];

        // 检查蛇头是否相撞
        if (playerHead.x === aiHead.x && playerHead.y === aiHead.y) {
            return 'player'; // 玩家蛇死亡
        }

        // 检查玩家蛇是否撞到AI蛇的身体
        if (this.aiSnake.segments.some(segment => 
            segment.x === playerHead.x && segment.y === playerHead.y
        )) {
            return 'player'; // 玩家蛇死亡
        }

        // 检查AI蛇是否撞到玩家蛇的身体
        if (this.snake.segments.some(segment => 
            segment.x === aiHead.x && segment.y === aiHead.y
        )) {
            return 'ai'; // AI蛇死亡
        }

        return false;
    }
}

// 初始化游戏
function initGame() {
    try {
        console.log('正在初始化游戏...');
        const canvas = document.getElementById('game-canvas');
        if (!canvas) {
            throw new Error('找不到游戏画布元素');
        }
        window.game = new Game();
        console.log('游戏初始化成功');
        return window.game;
    } catch (error) {
        console.error('游戏初始化失败:', error);
        alert('游戏初始化失败：' + error.message);
    }
}

// 确保在DOM加载完成后再初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM加载完成，开始初始化游戏...');
    initGame();
});