(function() {
    if (!window.Mario || !window.Enjine || !Mario.LevelState || !Mario.Shell || !Mario.Character) {
        return;
    }

    var originalCharacterMove = Mario.Character.prototype.Move;
    var originalCharacterCalcPic = Mario.Character.prototype.CalcPic;
    var originalLevelStateEnter = Mario.LevelState && Mario.LevelState.prototype.Enter;
    var originalMapGenerateLevel = Mario.MapState && Mario.MapState.prototype.GenerateLevel;
    var originalMapUpdate = Mario.MapState && Mario.MapState.prototype.Update;
    var originalMapLevelWon = Mario.MapState && Mario.MapState.prototype.LevelWon;
    var SLAM_FALL_SPEED = 16;
    var ORDERED_LEVEL_TYPES = [
        Mario.LevelType.Overground,
        Mario.LevelType.Underground,
        Mario.LevelType.Overground,
        Mario.LevelType.Castle
    ];

    function hashSeed(seedText) {
        var hash = 2166136261;
        var i = 0;

        for (i = 0; i < seedText.length; i++) {
            hash ^= seedText.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }

        return hash >>> 0;
    }

    function createSeededRandom(seed) {
        return function() {
            seed += 0x6D2B79F5;
            var value = seed;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
    }

    function bumpSlamBlock(world, x, y, canBreakBricks) {
        var block = world.Level.GetBlock(x, y);
        if (block === 0) return;

        world.Bump(x, y, canBreakBricks);

        if ((Mario.Tile.Behaviors[block & 0xff] & Mario.Tile.Breakable) > 0 && !canBreakBricks) {
            world.BumpInto(x, y - 1);
            world.Level.SetBlockData(x, y, 4);
            Enjine.Resources.PlaySound("bump");
        }
    }

    function triggerSlamLanding(character) {
        var world = character.World;
        if (!world || !world.Level) return;

        var yTile = ((character.Y + 1) / 16) | 0;
        var xLeft = ((character.X - character.Width) / 16) | 0;
        var xRight = ((character.X + character.Width) / 16) | 0;
        var canBreakBricks = character.Large;

        bumpSlamBlock(world, xLeft, yTile, canBreakBricks);
        if (xRight !== xLeft) {
            bumpSlamBlock(world, xRight, yTile, canBreakBricks);
        }
    }

    Mario.Character.prototype.Move = function() {
        var wantsSlam = Enjine.KeyboardInput.IsKeyDown(Enjine.Keys.Down) && !this.OnGround && this.DeathTime === 0 &&
            this.WinTime === 0 && this.PowerUpTime === 0;
        var wasSlamJumping = this.SlamJumping;

        this.SlamJumping = wantsSlam;
        if (wantsSlam && this.Ya < SLAM_FALL_SPEED) {
            this.JumpTime = 0;
            this.Ya = SLAM_FALL_SPEED;
            if (this.Large) {
                this.Ducking = true;
            }
        }

        originalCharacterMove.apply(this, arguments);

        if ((wasSlamJumping || wantsSlam) && this.OnGround) {
            this.SlamJumping = false;
            triggerSlamLanding(this);
        }
    };

    Mario.Character.prototype.CalcPic = function() {
        var restoreDucking = this.Ducking;

        if (this.SlamJumping && this.Large) {
            this.Ducking = true;
        }

        originalCharacterCalcPic.apply(this, arguments);

        if (this.SlamJumping && this.Large) {
            this.Ducking = restoreDucking;
            this.Height = 24;
        }
    };

    function getOrderedNodeIndex(mapState, x, y) {
        var nodes = mapState.OrderedLevelNodes || [];
        var i = 0;

        for (i = 0; i < nodes.length; i++) {
            if (nodes[i].x === x && nodes[i].y === y) {
                return i;
            }
        }

        return -1;
    }

    if (originalMapGenerateLevel && originalMapUpdate && originalMapLevelWon) {
        Mario.MapState.prototype.GenerateLevel = function() {
            var width = 320 / 16 + 1;
            var height = 240 / 16 + 1;
            var x = 0;
            var y = 0;
            var roadY = 8;
            var startX = 2;
            var nodes = [
                { x: 5, y: roadY },
                { x: 8, y: roadY },
                { x: 11, y: roadY },
                { x: 14, y: roadY }
            ];

            this.Level = [];
            this.Data = [];
            this.OrderedLevelNodes = nodes;

            for (x = 0; x < width; x++) {
                this.Level[x] = [];
                this.Data[x] = [];

                for (y = 0; y < height; y++) {
                    this.Level[x][y] = Mario.MapTile.Grass;
                    this.Data[x][y] = 0;
                }
            }

            for (x = startX; x <= nodes[nodes.length - 1].x; x++) {
                this.Level[x][roadY] = Mario.MapTile.Road;
                this.Data[x][roadY] = 0;
            }

            this.Level[startX][roadY] = Mario.MapTile.Level;
            this.Data[startX][roadY] = -11;

            for (x = 0; x < nodes.length; x++) {
                this.Level[nodes[x].x][nodes[x].y] = Mario.MapTile.Level;
                this.Data[nodes[x].x][nodes[x].y] = x === 0 ? 1 : -10;
            }

            this.XMario = startX * 16;
            this.YMario = roadY * 16;
            this.Farthest = nodes.length - 1;
            this.XFarthestCap = nodes[nodes.length - 1].x;
            this.YFarthestCap = nodes[nodes.length - 1].y;

            return true;
        };

        Mario.MapState.prototype.Update = function(delta) {
            var x = 0;
            var y = 0;
            var nodeIndex = -1;

            originalMapUpdate.call(this, delta);

            if (!this.EnterLevel || !this.OrderedLevelNodes) {
                return;
            }

            x = (this.XMario / 16) | 0;
            y = (this.YMario / 16) | 0;
            nodeIndex = getOrderedNodeIndex(this, x, y);

            if (nodeIndex < 0) {
                return;
            }

            Mario.MarioCharacter.LevelString = (this.WorldNumber + 1) + "-" + (nodeIndex + 1);
            this.LevelDifficulty = this.WorldNumber + 1 + (nodeIndex === 3 ? 2 : 0);
            this.LevelType = ORDERED_LEVEL_TYPES[nodeIndex] || Mario.LevelType.Overground;
        };

        Mario.MapState.prototype.LevelWon = function() {
            var x = this.XMario / 16;
            var y = this.YMario / 16;
            var nodeIndex = getOrderedNodeIndex(this, x, y);
            var nextNode = null;

            if (nodeIndex < 0 || !this.OrderedLevelNodes) {
                originalMapLevelWon.call(this);
                return;
            }

            if (nodeIndex >= this.OrderedLevelNodes.length - 1) {
                this.NextWorld();
                return;
            }

            this.Data[x][y] = 0;
            nextNode = this.OrderedLevelNodes[nodeIndex + 1];
            this.Data[nextNode.x][nextNode.y] = nodeIndex + 2;
            this.RenderStatic();
        };
    }

    if (originalLevelStateEnter) {
        Mario.LevelState.prototype.Enter = function() {
            var originalRandom = Math.random;
            var levelName = Mario.MarioCharacter && Mario.MarioCharacter.LevelString ? Mario.MarioCharacter.LevelString : "1-1";
            var seedText = levelName + ":" + this.LevelDifficulty + ":" + this.LevelType;

            Math.random = createSeededRandom(hashSeed(seedText));
            try {
                originalLevelStateEnter.apply(this, arguments);
            } finally {
                Math.random = originalRandom;
            }
        };
    }

    Mario.LevelState.prototype.Update = function(delta) {
        var i = 0, j = 0, xd = 0, yd = 0, sprite = null, hasShotCannon = false, xCannon = 0, x = 0, y = 0,
            dir = 0, st = null, b = 0, keepOffscreenShell = false;

        this.Delta = delta;

        this.TimeLeft -= delta;
        if ((this.TimeLeft | 0) === 0) {
            Mario.MarioCharacter.Die();
        }

        if (this.StartTime > 0) {
            this.StartTime++;
        }

        this.Camera.X = Mario.MarioCharacter.X - 160;
        if (this.Camera.X < 0) {
            this.Camera.X = 0;
        }
        if (this.Camera.X > this.Level.Width * 16 - 320) {
            this.Camera.X = this.Level.Width * 16 - 320;
        }

        this.FireballsOnScreen = 0;

        for (i = 0; i < this.Sprites.Objects.length; i++) {
            sprite = this.Sprites.Objects[i];
            if (sprite !== Mario.MarioCharacter) {
                xd = sprite.X - this.Camera.X;
                yd = sprite.Y - this.Camera.Y;
                if (xd < -64 || xd > 320 + 64 || yd < -64 || yd > 240 + 64) {
                    keepOffscreenShell = sprite instanceof Mario.Shell && !sprite.Dead && sprite.DeadTime === 0 &&
                        xd > 320 + 64 && yd >= -64 && yd <= 240 + 64;
                    if (!keepOffscreenShell) {
                        this.Sprites.RemoveAt(i);
                        i--;
                    }
                } else if (sprite instanceof Mario.Fireball) {
                    this.FireballsOnScreen++;
                }
            }
        }

        if (this.Paused) {
            for (i = 0; i < this.Sprites.Objects.length; i++) {
                if (this.Sprites.Objects[i] === Mario.MarioCharacter) {
                    this.Sprites.Objects[i].Update(delta);
                } else {
                    this.Sprites.Objects[i].UpdateNoMove(delta);
                }
            }
        } else {
            this.Layer.Update(delta);
            this.Level.Update();

            hasShotCannon = false;
            xCannon = 0;
            this.Tick++;

            for (x = ((this.Camera.X / 16) | 0) - 1; x <= (((this.Camera.X + this.Layer.Width) / 16) | 0) + 1; x++) {
                for (y = ((this.Camera.Y / 16) | 0) - 1; y <= (((this.Camera.Y + this.Layer.Height) / 16) | 0) + 1; y++) {
                    dir = 0;

                    if (x * 16 + 8 > Mario.MarioCharacter.X + 16) {
                        dir = -1;
                    }
                    if (x * 16 + 8 < Mario.MarioCharacter.X - 16) {
                        dir = 1;
                    }

                    st = this.Level.GetSpriteTemplate(x, y);

                    if (st !== null) {
                        if (st.LastVisibleTick !== this.Tick - 1) {
                            if (st.Sprite === null || !this.Sprites.Contains(st.Sprite)) {
                                st.Spawn(this, x, y, dir);
                            }
                        }

                        st.LastVisibleTick = this.Tick;
                    }

                    if (dir !== 0) {
                        b = this.Level.GetBlock(x, y);
                        if (((Mario.Tile.Behaviors[b & 0xff]) & Mario.Tile.Animated) > 0) {
                            if ((((b % 16) / 4) | 0) === 3 && ((b / 16) | 0) === 0) {
                                if ((this.Tick - x * 2) % 100 === 0) {
                                    xCannon = x;
                                    for (i = 0; i < 8; i++) {
                                        this.AddSprite(new Mario.Sparkle(this, x * 16 + 8, y * 16 + ((Math.random() * 16) | 0), Math.random() * dir, 0, 0, 1, 5));
                                    }
                                    this.AddSprite(new Mario.BulletBill(this, x * 16 + 8 + dir * 8, y * 16 + 15, dir));
                                    hasShotCannon = true;
                                }
                            }
                        }
                    }
                }
            }

            if (hasShotCannon) {
                Enjine.Resources.PlaySound("cannon");
            }

            for (i = 0; i < this.Sprites.Objects.length; i++) {
                this.Sprites.Objects[i].Update(delta);
            }

            for (i = 0; i < this.Sprites.Objects.length; i++) {
                this.Sprites.Objects[i].CollideCheck();
            }

            for (i = 0; i < this.ShellsToCheck.length; i++) {
                for (j = 0; j < this.Sprites.Objects.length; j++) {
                    if (this.Sprites.Objects[j] !== this.ShellsToCheck[i] && !this.ShellsToCheck[i].Dead) {
                        if (this.Sprites.Objects[j].ShellCollideCheck(this.ShellsToCheck[i])) {
                            if (Mario.MarioCharacter.Carried === this.ShellsToCheck[i] && !this.ShellsToCheck[i].Dead) {
                                Mario.MarioCharacter.Carried = null;
                                this.ShellsToCheck[i].Die();
                            }
                        }
                    }
                }
            }
            this.ShellsToCheck.length = 0;

            for (i = 0; i < this.FireballsToCheck.length; i++) {
                for (j = 0; j < this.Sprites.Objects.length; j++) {
                    if (this.Sprites.Objects[j] !== this.FireballsToCheck[i] && !this.FireballsToCheck[i].Dead) {
                        if (this.Sprites.Objects[j].FireballCollideCheck(this.FireballsToCheck[i])) {
                            this.FireballsToCheck[i].Die();
                        }
                    }
                }
            }

            this.FireballsToCheck.length = 0;
        }

        this.Sprites.AddRange(this.SpritesToAdd);
        this.Sprites.RemoveList(this.SpritesToRemove);
        this.SpritesToAdd.length = 0;
        this.SpritesToRemove.length = 0;

        this.Camera.X = (Mario.MarioCharacter.XOld + (Mario.MarioCharacter.X - Mario.MarioCharacter.XOld) * delta) - 160;
        this.Camera.Y = (Mario.MarioCharacter.YOld + (Mario.MarioCharacter.Y - Mario.MarioCharacter.YOld) * delta) - 120;
    };
})();
