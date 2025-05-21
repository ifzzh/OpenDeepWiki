using System.Text;
using System.Text.RegularExpressions;

namespace CodeDependencyAnalyzer
{
    public class DependencyAnalyzer
    {
        private readonly Dictionary<string, HashSet<string>> _fileDependencies = new();
        private readonly Dictionary<string, HashSet<string>> _functionDependencies = new();
        private readonly Dictionary<string, List<FunctionInfo>> _fileToFunctions = new();
        private readonly Dictionary<string, string> _functionToFile = new();
        private readonly List<ILanguageParser> _parsers = new();
        private readonly string _basePath;
        private bool _isInitialized = false;

        public DependencyAnalyzer(string basePath)
        {
            _basePath = basePath;
            
            // 注册不同语言的解析器
            _parsers.Add(new CSharpParser());
            _parsers.Add(new JavaScriptParser());
            _parsers.Add(new PythonParser());
            _parsers.Add(new JavaParser());
            _parsers.Add(new CppParser());
        }

        public async Task Initialize()
        {
            if (_isInitialized)
                return;
                
            var files = GetAllSourceFiles(_basePath);
            
            // 并行处理所有文件以提高性能
            var tasks = files.Select(async file => 
            {
                var extension = Path.GetExtension(file).ToLowerInvariant();
                var parser = GetParserForFile(file);
                
                if (parser != null)
                {
                    var fileContent = await File.ReadAllTextAsync(file);
                    await ProcessFile(file, fileContent, parser);
                }
            });
            
            await Task.WhenAll(tasks);
            _isInitialized = true;
        }

        private async Task ProcessFile(string filePath, string fileContent, ILanguageParser parser)
        {
            try
            {
                // 提取文件级依赖
                var imports = parser.ExtractImports(fileContent);
                var resolvedImports = ResolveImportPaths(imports, filePath, _basePath);
                
                lock (_fileDependencies)
                {
                    _fileDependencies[filePath] = resolvedImports;
                }
                
                // 提取函数信息
                var functions = parser.ExtractFunctions(fileContent);
                var functionInfoList = new List<FunctionInfo>();
                
                foreach (var function in functions)
                {
                    var functionInfo = new FunctionInfo
                    {
                        Name = function.Name,
                        FullName = $"{filePath}:{function.Name}",
                        Body = function.Body,
                        FilePath = filePath,
                        LineNumber = parser.GetFunctionLineNumber(fileContent, function.Name),
                        Calls = parser.ExtractFunctionCalls(function.Body)
                    };
                    
                    functionInfoList.Add(functionInfo);
                    
                    lock (_functionToFile)
                    {
                        _functionToFile[functionInfo.FullName] = filePath;
                    }
                }
                
                lock (_fileToFunctions)
                {
                    _fileToFunctions[filePath] = functionInfoList;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"处理文件 {filePath} 时出错: {ex.Message}");
            }
        }

        public async Task<DependencyTree> AnalyzeFileDependencyTree(string filePath)
        {
            await Initialize();
            
            var normalizedPath = Path.GetFullPath(filePath);
            var visited = new HashSet<string>();
            
            return BuildFileDependencyTree(normalizedPath, visited, 0);
        }

        public async Task<DependencyTree> AnalyzeFunctionDependencyTree(string filePath, string functionName)
        {
            await Initialize();
            
            var normalizedPath = Path.GetFullPath(filePath);
            var fullFunctionId = $"{normalizedPath}:{functionName}";
            var visited = new HashSet<string>();
            
            return BuildFunctionDependencyTree(normalizedPath, functionName, visited, 0);
        }

        private DependencyTree BuildFileDependencyTree(string filePath, HashSet<string> visited, int level, int maxDepth = 10)
        {
            if (level > maxDepth || visited.Contains(filePath))
            {
                return new DependencyTree
                {
                    NodeType = DependencyNodeType.File,
                    Name = Path.GetFileName(filePath),
                    FullPath = filePath,
                    IsCyclic = visited.Contains(filePath)
                };
            }
            
            visited.Add(filePath);
            
            var tree = new DependencyTree
            {
                NodeType = DependencyNodeType.File,
                Name = Path.GetFileName(filePath),
                FullPath = filePath,
                IsCyclic = false,
                Children = new List<DependencyTree>()
            };
            
            // 添加子文件依赖
            if (_fileDependencies.TryGetValue(filePath, out var dependencies))
            {
                foreach (var dependency in dependencies)
                {
                    var childVisited = new HashSet<string>(visited);
                    var child = BuildFileDependencyTree(dependency, childVisited, level + 1, maxDepth);
                    tree.Children.Add(child);
                }
            }
            
            // 添加文件中的函数
            if (_fileToFunctions.TryGetValue(filePath, out var functions))
            {
                foreach (var function in functions)
                {
                    tree.Functions.Add(new DependencyTreeFunction
                    {
                        Name = function.Name,
                        LineNumber = function.LineNumber
                    });
                }
            }
            
            return tree;
        }

        private DependencyTree BuildFunctionDependencyTree(string filePath, string functionName, HashSet<string> visited, int level, int maxDepth = 20)
        {
            var fullFunctionId = $"{filePath}:{functionName}";
            
            if (level > maxDepth || visited.Contains(fullFunctionId))
            {
                return new DependencyTree
                {
                    NodeType = DependencyNodeType.Function,
                    Name = functionName,
                    FullPath = fullFunctionId,
                    IsCyclic = visited.Contains(fullFunctionId)
                };
            }
            
            visited.Add(fullFunctionId);
            
            var tree = new DependencyTree
            {
                NodeType = DependencyNodeType.Function,
                Name = functionName,
                FullPath = fullFunctionId,
                IsCyclic = false,
                Children = new List<DependencyTree>()
            };
            
            // 找到当前函数的信息
            if (_fileToFunctions.TryGetValue(filePath, out var functions))
            {
                var function = functions.FirstOrDefault(f => f.Name == functionName);
                if (function != null)
                {
                    tree.LineNumber = function.LineNumber;
                    
                    // 解析函数调用
                    foreach (var calledFunction in function.Calls)
                    {
                        // 尝试解析被调用函数的完整路径
                        var resolvedFunction = ResolveFunctionCall(calledFunction, filePath);
                        if (resolvedFunction != null)
                        {
                            var calledFilePath = resolvedFunction.FilePath;
                            var calledFunctionName = resolvedFunction.Name;
                            
                            var childVisited = new HashSet<string>(visited);
                            var child = BuildFunctionDependencyTree(calledFilePath, calledFunctionName, childVisited, level + 1, maxDepth);
                            tree.Children.Add(child);
                        }
                    }
                }
            }
            
            return tree;
        }

        private HashSet<string> ResolveImportPaths(List<string> imports, string currentFile, string basePath)
        {
            var result = new HashSet<string>();
            var currentDir = Path.GetDirectoryName(currentFile);
            var parser = GetParserForFile(currentFile);
            
            foreach (var import in imports)
            {
                // 根据特定语言解析导入路径
                var resolvedPath = parser.ResolveImportPath(import, currentFile, basePath);
                if (!string.IsNullOrEmpty(resolvedPath) && File.Exists(resolvedPath))
                {
                    result.Add(Path.GetFullPath(resolvedPath));
                }
            }
            
            return result;
        }

        private FunctionInfo ResolveFunctionCall(string functionCall, string currentFile)
        {
            // 检查是否为本地函数
            if (_fileToFunctions.TryGetValue(currentFile, out var functions))
            {
                var localFunction = functions.FirstOrDefault(f => f.Name == functionCall);
                if (localFunction != null)
                {
                    return localFunction;
                }
            }
            
            // 检查导入文件中的函数
            if (_fileDependencies.TryGetValue(currentFile, out var dependencies))
            {
                foreach (var dependency in dependencies)
                {
                    if (_fileToFunctions.TryGetValue(dependency, out var dependencyFunctions))
                    {
                        var depFunction = dependencyFunctions.FirstOrDefault(f => f.Name == functionCall);
                        if (depFunction != null)
                        {
                            return depFunction;
                        }
                    }
                }
            }
            
            // 尝试在全局范围内搜索同名函数
            foreach (var entry in _fileToFunctions)
            {
                var foundFunction = entry.Value.FirstOrDefault(f => f.Name == functionCall);
                if (foundFunction != null)
                {
                    return foundFunction;
                }
            }
            
            return null;
        }

        private ILanguageParser GetParserForFile(string filePath)
        {
            var extension = Path.GetExtension(filePath).ToLowerInvariant();
            
            return extension switch
            {
                ".cs" => _parsers.FirstOrDefault(p => p is CSharpParser),
                ".js" => _parsers.FirstOrDefault(p => p is JavaScriptParser),
                ".py" => _parsers.FirstOrDefault(p => p is PythonParser),
                ".java" => _parsers.FirstOrDefault(p => p is JavaParser),
                ".cpp" or ".h" or ".hpp" => _parsers.FirstOrDefault(p => p is CppParser),
                _ => null
            };
        }

        private List<string> GetAllSourceFiles(string path)
        {
            var extensions = new[] { ".cs", ".js", ".py", ".java", ".cpp", ".h", ".hpp" };
            return Directory.GetFiles(path, "*.*", SearchOption.AllDirectories)
                .Where(f => extensions.Contains(Path.GetExtension(f).ToLowerInvariant()))
                .ToList();
        }

        public string GenerateDependencyTreeVisualization(DependencyTree tree)
        {
            var sb = new StringBuilder();
            GenerateTreeVisualization(tree, sb, "", true);
            return sb.ToString();
        }

        private void GenerateTreeVisualization(DependencyTree node, StringBuilder sb, string indent, bool isLast)
        {
            // 显示当前节点
            var nodeMarker = isLast ? "└── " : "├── ";
            var nodeType = node.NodeType == DependencyNodeType.File ? "[文件]" : "[函数]";
            var cyclicMarker = node.IsCyclic ? " (循环引用)" : "";
            var lineInfo = node.LineNumber > 0 ? $" (行: {node.LineNumber})" : "";
            
            sb.AppendLine($"{indent}{nodeMarker}{nodeType} {node.Name}{lineInfo}{cyclicMarker}");
            
            // 生成下一级缩进
            var childIndent = indent + (isLast ? "    " : "│   ");
            
            // 显示函数列表（仅适用于文件节点）
            if (node.NodeType == DependencyNodeType.File && node.Functions.Count > 0 && !node.IsCyclic)
            {
                sb.AppendLine($"{childIndent}├── [函数列表]");
                var functionsIndent = childIndent + "│   ";
                
                for (int i = 0; i < node.Functions.Count; i++)
                {
                    var function = node.Functions[i];
                    var functionMarker = i == node.Functions.Count - 1 ? "└── " : "├── ";
                    var functionLineInfo = function.LineNumber > 0 ? $" (行: {function.LineNumber})" : "";
                    sb.AppendLine($"{functionsIndent}{functionMarker}{function.Name}{functionLineInfo}");
                }
            }
            
            // 显示子节点
            if (node is { IsCyclic: false, Children: not null })
            {
                for (int i = 0; i < node.Children.Count; i++)
                {
                    GenerateTreeVisualization(node.Children[i], sb, childIndent, i == node.Children.Count - 1);
                }
            }
        }

        public string GenerateDotGraph(DependencyTree tree)
        {
            var sb = new StringBuilder();
            sb.AppendLine("digraph DependencyTree {");
            sb.AppendLine("  node [shape=box, style=filled, fontname=\"Arial\"];");
            sb.AppendLine("  edge [fontname=\"Arial\"];");
            
            // 生成节点和边
            var nodeCounter = new Dictionary<string, int>();
            GenerateDotNodes(tree, sb, nodeCounter);
            
            sb.AppendLine("}");
            return sb.ToString();
        }

        private void GenerateDotNodes(DependencyTree node, StringBuilder sb, Dictionary<string, int> nodeCounter, string parentId = null)
        {
            // 生成唯一节点ID
            string nodeId;
            if (!nodeCounter.ContainsKey(node.FullPath))
            {
                nodeCounter[node.FullPath] = nodeCounter.Count;
            }
            nodeId = $"node{nodeCounter[node.FullPath]}";
            
            // 节点样式
            string nodeColor = node.NodeType == DependencyNodeType.File ? "lightblue" : "lightgreen";
            if (node.IsCyclic) nodeColor = "lightsalmon";
            
            string label = node.Name;
            if (node.LineNumber > 0) label += $"\\n(行: {node.LineNumber})";
            if (node.IsCyclic) label += "\\n(循环引用)";
            
            // 创建节点
            sb.AppendLine($"  {nodeId} [label=\"{label}\", fillcolor=\"{nodeColor}\"];");
            
            // 与父节点连接
            if (parentId != null)
            {
                sb.AppendLine($"  {parentId} -> {nodeId};");
            }
            
            // 递归处理子节点
            if (!node.IsCyclic && node.Children != null)
            {
                foreach (var child in node.Children)
                {
                    GenerateDotNodes(child, sb, nodeCounter, nodeId);
                }
            }
        }
    }

    public class FunctionInfo
    {
        public string Name { get; set; }
        public string FullName { get; set; }
        public string Body { get; set; }
        public string FilePath { get; set; }
        public int LineNumber { get; set; }
        public List<string> Calls { get; set; } = new List<string>();
    }

    public class Function
    {
        public string Name { get; set; }
        public string Body { get; set; }
    }

    public enum DependencyNodeType
    {
        File,
        Function
    }

    public class DependencyTree
    {
        public DependencyNodeType NodeType { get; set; }
        public string Name { get; set; }
        public string FullPath { get; set; }
        public int LineNumber { get; set; }
        public bool IsCyclic { get; set; }
        public List<DependencyTree> Children { get; set; } = new List<DependencyTree>();
        public List<DependencyTreeFunction> Functions { get; set; } = new List<DependencyTreeFunction>();
    }

    public class DependencyTreeFunction
    {
        public string Name { get; set; }
        public int LineNumber { get; set; }
    }

    public interface ILanguageParser
    {
        List<string> ExtractImports(string fileContent);
        List<Function> ExtractFunctions(string fileContent);
        List<string> ExtractFunctionCalls(string functionBody);
        string ResolveImportPath(string import, string currentFilePath, string basePath);
        int GetFunctionLineNumber(string fileContent, string functionName);
    }

    public class CSharpParser : ILanguageParser
    {
        public List<string> ExtractImports(string fileContent)
        {
            var imports = new List<string>();
            // var syntaxTree = CSharpSyntaxTree.ParseText(fileContent);
            // var root = syntaxTree.GetCompilationUnitRoot();
            //
            // foreach (var usingDirective in root.Usings)
            // {
            //     imports.Add(usingDirective.Name.ToString());
            // }
            
            return imports;
        }

        public List<Function> ExtractFunctions(string fileContent)
        {
            var functions = new List<Function>();
            // var syntaxTree = CSharpSyntaxTree.ParseText(fileContent);
            // var root = syntaxTree.GetCompilationUnitRoot();
            //
            // // 提取所有方法声明
            // var methodDeclarations = root.DescendantNodes().OfType<MethodDeclarationSyntax>();
            //
            // foreach (var method in methodDeclarations)
            // {
            //     functions.Add(new Function
            //     {
            //         Name = method.Identifier.ValueText,
            //         Body = method.Body?.ToString() ?? method.ExpressionBody?.ToString() ?? string.Empty
            //     });
            // }
            
            return functions;
        }

        public List<string> ExtractFunctionCalls(string functionBody)
        {
            var functionCalls = new List<string>();
            
            // try
            // {
            //     var syntaxTree = CSharpSyntaxTree.ParseText($"class C {{ void M() {{ {functionBody} }} }}");
            //     var root = syntaxTree.GetCompilationUnitRoot();
            //     
            //     // 提取所有方法调用
            //     var invocations = root.DescendantNodes().OfType<InvocationExpressionSyntax>();
            //     
            //     foreach (var invocation in invocations)
            //     {
            //         if (invocation.Expression is MemberAccessExpressionSyntax memberAccess)
            //         {
            //             functionCalls.Add(memberAccess.Name.Identifier.ValueText);
            //         }
            //         else if (invocation.Expression is IdentifierNameSyntax identifier)
            //         {
            //             functionCalls.Add(identifier.Identifier.ValueText);
            //         }
            //     }
            // }
            // catch
            // {
            //     // 使用正则表达式作为备用解析方法
            //     var callRegex = new Regex(@"(\w+)\s*\(", RegexOptions.Compiled);
            //     var matches = callRegex.Matches(functionBody);
            //     
            //     foreach (Match match in matches)
            //     {
            //         var name = match.Groups[1].Value;
            //         if (!new[] { "if", "for", "while", "switch", "catch" }.Contains(name))
            //         {
            //             functionCalls.Add(name);
            //         }
            //     }
            // }
            
            return functionCalls;
        }

        public string ResolveImportPath(string import, string currentFilePath, string basePath)
        {
            // C#使用命名空间而非直接引用文件，需要解析项目文件
            var currentDir = Path.GetDirectoryName(currentFilePath);
            
            // 尝试从项目中查找类型
            var parts = import.Split('.');
            var typeName = parts.Last();
            
            // 在项目中查找包含此类型名称的文件
            var possibleFiles = Directory.GetFiles(basePath, "*.cs", SearchOption.AllDirectories);
            
            foreach (var file in possibleFiles)
            {
                if (file == currentFilePath) continue;
                
                var content = File.ReadAllText(file);
                // 检查文件是否包含此类型声明
                if (content.Contains($"class {typeName}") || 
                    content.Contains($"struct {typeName}") || 
                    content.Contains($"interface {typeName}") || 
                    content.Contains($"enum {typeName}"))
                {
                    // 检查命名空间是否匹配
                    var namespaceRegex = new Regex($@"namespace\s+({string.Join(@"\.", parts.Take(parts.Length - 1))})\s*{{");
                    if (namespaceRegex.IsMatch(content))
                    {
                        return file;
                    }
                }
            }
            
            return null;
        }

        public int GetFunctionLineNumber(string fileContent, string functionName)
        {
            var lines = fileContent.Split('\n');
            var methodRegex = new Regex($@"\b{functionName}\s*\(");
            
            for (int i = 0; i < lines.Length; i++)
            {
                if (methodRegex.IsMatch(lines[i]) && lines[i].Contains("void") || 
                    lines[i].Contains("int") || lines[i].Contains("string") || 
                    lines[i].Contains("bool") || lines[i].Contains("object") ||
                    lines[i].Contains("Task"))
                {
                    return i + 1;
                }
            }
            
            return 0;
        }
    }

    public class JavaScriptParser : ILanguageParser
    {
        public List<string> ExtractImports(string fileContent)
        {
            var imports = new List<string>();
            
            // 匹配ES6导入语句
            var importRegex = new Regex(@"import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['""]([^'""]+)['""];", RegexOptions.Compiled);
            var matches = importRegex.Matches(fileContent);
            
            foreach (Match match in matches)
            {
                imports.Add(match.Groups[1].Value);
            }
            
            // 匹配CommonJS导入
            var requireRegex = new Regex(@"(?:const|let|var)\s+(?:{\s*[^}]*\s*}|\w+)\s*=\s*require\(['""]([^'""]+)['""]", RegexOptions.Compiled);
            matches = requireRegex.Matches(fileContent);
            
            foreach (Match match in matches)
            {
                imports.Add(match.Groups[1].Value);
            }
            
            return imports;
        }

        public List<Function> ExtractFunctions(string fileContent)
        {
            var functions = new List<Function>();
            
            // 匹配函数声明
            var funcRegex = new Regex(@"(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*function|(?:const|let|var)\s+(\w+)\s*=\s*\([^)]*\)\s*=>)\s*{([^{}]*(?:{[^{}]*(?:{[^{}]*}[^{}]*)*}[^{}]*)*)}", RegexOptions.Compiled | RegexOptions.Singleline);
            var matches = funcRegex.Matches(fileContent);
            
            foreach (Match match in matches)
            {
                var name = match.Groups[1].Success ? match.Groups[1].Value : 
                           match.Groups[2].Success ? match.Groups[2].Value :
                           match.Groups[3].Value;
                
                functions.Add(new Function
                {
                    Name = name,
                    Body = match.Groups[4].Value
                });
            }
            
            // 匹配类方法
            var methodRegex = new Regex(@"(\w+)\s*\([^)]*\)\s*{([^{}]*(?:{[^{}]*(?:{[^{}]*}[^{}]*)*}[^{}]*)*)}", RegexOptions.Compiled | RegexOptions.Singleline);
            matches = methodRegex.Matches(fileContent);
            
            foreach (Match match in matches)
            {
                if (!match.Groups[1].Value.Equals("function", StringComparison.OrdinalIgnoreCase))
                {
                    functions.Add(new Function
                    {
                        Name = match.Groups[1].Value,
                        Body = match.Groups[2].Value
                    });
                }
            }
            
            return functions;
        }

        public List<string> ExtractFunctionCalls(string functionBody)
        {
            var functionCalls = new List<string>();
            
            // 匹配函数调用
            var callRegex = new Regex(@"(\w+)\s*\(", RegexOptions.Compiled);
            var matches = callRegex.Matches(functionBody);
            
            foreach (Match match in matches)
            {
                var name = match.Groups[1].Value;
                // 过滤一些常见的JS API和关键字
                if (!new[] { "if", "for", "while", "switch", "catch" }.Contains(name))
                {
                    functionCalls.Add(name);
                }
            }
            
            // 匹配方法调用
            var methodCallRegex = new Regex(@"(\w+)\.(\w+)\s*\(", RegexOptions.Compiled);
            matches = methodCallRegex.Matches(functionBody);
            
            foreach (Match match in matches)
            {
                functionCalls.Add(match.Groups[2].Value);
            }
            
            return functionCalls;
        }

        public string ResolveImportPath(string import, string currentFilePath, string basePath)
        {
            var currentDir = Path.GetDirectoryName(currentFilePath);
            
            // 处理相对路径导入
            if (import.StartsWith("./") || import.StartsWith("../"))
            {
                var resolvedPath = Path.GetFullPath(Path.Combine(currentDir, import));
                
                // 处理没有扩展名的情况
                if (!Path.HasExtension(resolvedPath))
                {
                    if (File.Exists(resolvedPath + ".js")) return resolvedPath + ".js";
                    if (File.Exists(resolvedPath + ".jsx")) return resolvedPath + ".jsx";
                    if (File.Exists(resolvedPath + ".ts")) return resolvedPath + ".ts";
                    if (File.Exists(resolvedPath + ".tsx")) return resolvedPath + ".tsx";
                    
                    // 检查是否为目录中的index文件
                    if (Directory.Exists(resolvedPath))
                    {
                        if (File.Exists(Path.Combine(resolvedPath, "index.js"))) 
                            return Path.Combine(resolvedPath, "index.js");
                        if (File.Exists(Path.Combine(resolvedPath, "index.jsx"))) 
                            return Path.Combine(resolvedPath, "index.jsx");
                        if (File.Exists(Path.Combine(resolvedPath, "index.ts"))) 
                            return Path.Combine(resolvedPath, "index.ts");
                        if (File.Exists(Path.Combine(resolvedPath, "index.tsx"))) 
                            return Path.Combine(resolvedPath, "index.tsx");
                    }
                }
                else if (File.Exists(resolvedPath))
                {
                    return resolvedPath;
                }
            }
            // 处理包导入
            else if (!import.StartsWith("/"))
            {
                // 在node_modules中搜索
                var nodeModulesPath = FindNodeModulesPath(currentDir);
                if (!string.IsNullOrEmpty(nodeModulesPath))
                {
                    var packagePath = Path.Combine(nodeModulesPath, import);
                    
                    // 检查包入口点
                    if (Directory.Exists(packagePath))
                    {
                        // 读取package.json
                        var packageJson = Path.Combine(packagePath, "package.json");
                        if (File.Exists(packageJson))
                        {
                            try
                            {
                                var jsonContent = File.ReadAllText(packageJson);
                                var mainRegex = new Regex(@"""main"":\s*""([^""]+)""");
                                var match = mainRegex.Match(jsonContent);
                                if (match.Success)
                                {
                                    var mainFile = Path.Combine(packagePath, match.Groups[1].Value);
                                    if (File.Exists(mainFile)) return mainFile;
                                }
                            }
                            catch
                            {
                                // 忽略JSON解析错误
                            }
                        }
                        
                        // 默认检查index文件
                        if (File.Exists(Path.Combine(packagePath, "index.js")))
                            return Path.Combine(packagePath, "index.js");
                    }
                }
                
                // 尝试在项目中搜索匹配的文件
                var possibleFiles = Directory.GetFiles(basePath, "*.js", SearchOption.AllDirectories);
                foreach (var file in possibleFiles)
                {
                    if (Path.GetFileNameWithoutExtension(file) == import || 
                        Path.GetFileName(file) == import + ".js")
                    {
                        return file;
                    }
                }
            }
            
            return null;
        }
        private string FindNodeModulesPath(string startDir)
        {
            var currentDir = startDir;
            while (!string.IsNullOrEmpty(currentDir))
            {
                var nodeModulesPath = Path.Combine(currentDir, "node_modules");
                if (Directory.Exists(nodeModulesPath))
                {
                    return nodeModulesPath;
                }
                
                currentDir = Path.GetDirectoryName(currentDir);
            }
            
            return null;
        }

        public int GetFunctionLineNumber(string fileContent, string functionName)
        {
            var lines = fileContent.Split('\n');
            
            // 检查函数声明
            var funcRegex = new Regex($@"function\s+{functionName}\s*\(|const\s+{functionName}\s*=\s*function|const\s+{functionName}\s*=\s*\(|let\s+{functionName}\s*=\s*function|let\s+{functionName}\s*=\s*\(|var\s+{functionName}\s*=\s*function|var\s+{functionName}\s*=\s*\(");
            
            for (int i = 0; i < lines.Length; i++)
            {
                if (funcRegex.IsMatch(lines[i]))
                {
                    return i + 1;
                }
            }
            
            // 检查类方法
            var methodRegex = new Regex($@"\b{functionName}\s*\([^)]*\)\s*{{");
            
            for (int i = 0; i < lines.Length; i++)
            {
                if (methodRegex.IsMatch(lines[i]))
                {
                    return i + 1;
                }
            }
            
            return 0;
        }
    }

    public class PythonParser : ILanguageParser
    {
        public List<string> ExtractImports(string fileContent)
        {
            var imports = new List<string>();
            
            // 匹配import语句
            var importRegex = new Regex(@"import\s+([^\s,;]+)(?:\s*,\s*([^\s,;]+))*", RegexOptions.Compiled);
            var matches = importRegex.Matches(fileContent);
            
            foreach (Match match in matches)
            {
                for (int i = 1; i < match.Groups.Count; i++)
                {
                    if (match.Groups[i].Success && !string.IsNullOrWhiteSpace(match.Groups[i].Value))
                    {
                        imports.Add(match.Groups[i].Value);
                    }
                }
            }
            
            // 匹配from...import语句
            var fromImportRegex = new Regex(@"from\s+([^\s]+)\s+import\s+(?:([^\s,;]+)(?:\s*,\s*([^\s,;]+))*|\*)", RegexOptions.Compiled);
            matches = fromImportRegex.Matches(fileContent);
            
            foreach (Match match in matches)
            {
                imports.Add(match.Groups[1].Value);
            }
            
            return imports;
        }

        public List<Function> ExtractFunctions(string fileContent)
        {
            var functions = new List<Function>();
            
            // 匹配函数定义
            var funcRegex = new Regex(@"def\s+(\w+)\s*\([^)]*\)\s*(?:->\s*[^:]+)?\s*:(.*?)(?=\n(?:def|class)|\Z)", RegexOptions.Compiled | RegexOptions.Singleline);
            var matches = funcRegex.Matches(fileContent);
            
            foreach (Match match in matches)
            {
                functions.Add(new Function
                {
                    Name = match.Groups[1].Value,
                    Body = match.Groups[2].Value
                });
            }
            
            return functions;
        }

        public List<string> ExtractFunctionCalls(string functionBody)
        {
            var functionCalls = new List<string>();
            
            // 匹配函数调用
            var callRegex = new Regex(@"(\w+)\s*\(", RegexOptions.Compiled);
            var matches = callRegex.Matches(functionBody);
            
            foreach (Match match in matches)
            {
                var name = match.Groups[1].Value;
                // 过滤一些常见的Python内置函数和关键字
                if (!new[] { "print", "len", "int", "str", "list", "dict", "set", "tuple", "if", "while", "for" }.Contains(name))
                {
                    functionCalls.Add(name);
                }
            }
            
            // 匹配方法调用
            var methodCallRegex = new Regex(@"(\w+)\.(\w+)\s*\(", RegexOptions.Compiled);
            matches = methodCallRegex.Matches(functionBody);
            
            foreach (Match match in matches)
            {
                functionCalls.Add(match.Groups[2].Value);
            }
            
            return functionCalls;
        }

        public string ResolveImportPath(string import, string currentFilePath, string basePath)
        {
            var currentDir = Path.GetDirectoryName(currentFilePath);
            
            // 处理相对导入（以.开头）
            if (import.StartsWith("."))
            {
                var parts = import.Split('.');
                var dir = currentDir;
                
                // 处理上级目录导入
                for (int i = 0; i < parts.Length; i++)
                {
                    if (string.IsNullOrEmpty(parts[i]))
                    {
                        dir = Path.GetDirectoryName(dir);
                    }
                    else
                    {
                        var modulePath = Path.Combine(dir, parts[i] + ".py");
                        if (File.Exists(modulePath))
                        {
                            return modulePath;
                        }
                        
                        // 检查是否为包（目录）
                        var packagePath = Path.Combine(dir, parts[i]);
                        var initPath = Path.Combine(packagePath, "__init__.py");
                        if (Directory.Exists(packagePath) && File.Exists(initPath))
                        {
                            return initPath;
                        }
                    }
                }
            }
            // 处理绝对导入
            else
            {
                // 搜索整个项目中的模块
                var moduleName = import.Split('.')[0];
                var possibleFiles = Directory.GetFiles(basePath, moduleName + ".py", SearchOption.AllDirectories);
                
                if (possibleFiles.Length > 0)
                {
                    return possibleFiles[0];
                }
                
                // 搜索包
                var possibleDirs = Directory.GetDirectories(basePath, moduleName, SearchOption.AllDirectories);
                foreach (var dir in possibleDirs)
                {
                    var initPath = Path.Combine(dir, "__init__.py");
                    if (File.Exists(initPath))
                    {
                        return initPath;
                    }
                }
            }
            
            return null;
        }

        public int GetFunctionLineNumber(string fileContent, string functionName)
        {
            var lines = fileContent.Split('\n');
            var funcRegex = new Regex($@"def\s+{functionName}\s*\(");
            
            for (int i = 0; i < lines.Length; i++)
            {
                if (funcRegex.IsMatch(lines[i]))
                {
                    return i + 1;
                }
            }
            
            return 0;
        }
    }

    public class JavaParser : ILanguageParser
    {
        public List<string> ExtractImports(string fileContent)
        {
            var imports = new List<string>();
            
            // 匹配import语句
            var importRegex = new Regex(@"import\s+([^;]+);", RegexOptions.Compiled);
            var matches = importRegex.Matches(fileContent);
            
            foreach (Match match in matches)
            {
                imports.Add(match.Groups[1].Value.Trim());
            }
            
            return imports;
        }

        public List<Function> ExtractFunctions(string fileContent)
        {
            var functions = new List<Function>();
            
            // 匹配方法定义
            var methodRegex = new Regex(@"(?:public|private|protected|static|\s) +(?:[a-zA-Z0-9_\.<>\[\]]+) +([a-zA-Z0-9_]+) *\([^)]*\) *(?:throws [^{]*)?\{([^{}]*(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}[^{}]*)*)\}", RegexOptions.Compiled);
            var matches = methodRegex.Matches(fileContent);
            
            foreach (Match match in matches)
            {
                var name = match.Groups[1].Value;
                if (!new[] { "if", "for", "while", "switch", "catch" }.Contains(name))
                {
                    functions.Add(new Function
                    {
                        Name = name,
                        Body = match.Groups[2].Value
                    });
                }
            }
            
            return functions;
        }

        public List<string> ExtractFunctionCalls(string functionBody)
        {
            var functionCalls = new List<string>();
            
            // 匹配方法调用
            var callRegex = new Regex(@"(?:\b[a-zA-Z0-9_]+\.)?\b([a-zA-Z0-9_]+)\s*\(", RegexOptions.Compiled);
            var matches = callRegex.Matches(functionBody);
            
            foreach (Match match in matches)
            {
                var name = match.Groups[1].Value;
                // 过滤一些常见的关键字
                if (!new[] { "if", "for", "while", "switch", "catch" }.Contains(name))
                {
                    functionCalls.Add(name);
                }
            }
            
            return functionCalls;
        }

        public string ResolveImportPath(string import, string currentFilePath, string basePath)
        {
            var parts = import.Split('.');
            var className = parts[parts.Length - 1];
            
            // 处理wildcard导入
            if (className.Equals("*"))
            {
                className = "";
            }
            
            // 在项目中搜索类文件
            var possibleFiles = Directory.GetFiles(basePath, "*.java", SearchOption.AllDirectories);
            
            foreach (var file in possibleFiles)
            {
                if (string.IsNullOrEmpty(className))
                {
                    // 检查包声明是否匹配
                    var content = File.ReadAllText(file);
                    var packageRegex = new Regex($@"package\s+{string.Join("\\.", parts.Take(parts.Length - 1))};");
                    if (packageRegex.IsMatch(content))
                    {
                        return file;
                    }
                }
                else if (Path.GetFileNameWithoutExtension(file).Equals(className, StringComparison.OrdinalIgnoreCase))
                {
                    // 检查包声明是否匹配
                    var content = File.ReadAllText(file);
                    var packageRegex = new Regex($@"package\s+{string.Join("\\.", parts.Take(parts.Length - 1))};");
                    if (packageRegex.IsMatch(content))
                    {
                        return file;
                    }
                }
            }
            
            return null;
        }

        public int GetFunctionLineNumber(string fileContent, string functionName)
        {
            var lines = fileContent.Split('\n');
            var methodRegex = new Regex($@"(?:public|private|protected|static|\s) +(?:[a-zA-Z0-9_\.<>\[\]]+) +{functionName} *\(");
            
            for (int i = 0; i < lines.Length; i++)
            {
                if (methodRegex.IsMatch(lines[i]))
                {
                    return i + 1;
                }
            }
            
            return 0;
        }
    }

    public class CppParser : ILanguageParser
    {
        public List<string> ExtractImports(string fileContent)
        {
            var imports = new List<string>();
            
            // 匹配#include语句
            var includeRegex = new Regex(@"#include\s+[<""]([^>""]+)[>""]", RegexOptions.Compiled);
            var matches = includeRegex.Matches(fileContent);
            
            foreach (Match match in matches)
            {
                imports.Add(match.Groups[1].Value);
            }
            
            return imports;
        }

        public List<Function> ExtractFunctions(string fileContent)
        {
            var functions = new List<Function>();
            
            // 匹配函数定义（简化版，不处理所有C++语法复杂情况）
            var funcRegex = new Regex(@"(?:(?:[a-zA-Z0-9_\*&\s:<>,]+)\s+)?([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:const)?\s*(?:noexcept)?\s*(?:override)?\s*(?:final)?\s*(?:=\s*default)?\s*(?:=\s*delete)?\s*(?:=\s*0)?\s*\{([^{}]*(?:{[^{}]*(?:{[^{}]*}[^{}]*)*}[^{}]*)*)\}", RegexOptions.Compiled);
            var matches = funcRegex.Matches(fileContent);
            
            foreach (Match match in matches)
            {
                var name = match.Groups[1].Value;
                // 过滤掉构造函数、析构函数和关键字
                if (!name.StartsWith("~") && !new[] { "if", "for", "while", "switch", "catch" }.Contains(name))
                {
                    functions.Add(new Function
                    {
                        Name = name,
                        Body = match.Groups[2].Value
                    });
                }
            }
            
            return functions;
        }

        public List<string> ExtractFunctionCalls(string functionBody)
        {
            var functionCalls = new List<string>();
            
            // 匹配函数调用
            var callRegex = new Regex(@"(?:(?:[a-zA-Z0-9_]+)::)?([a-zA-Z0-9_]+)\s*\(", RegexOptions.Compiled);
            var matches = callRegex.Matches(functionBody);
            
            foreach (Match match in matches)
            {
                var name = match.Groups[1].Value;
                // 过滤一些常见的关键字
                if (!new[] { "if", "for", "while", "switch", "catch" }.Contains(name))
                {
                    functionCalls.Add(name);
                }
            }
            
            return functionCalls;
        }

        public string ResolveImportPath(string import, string currentFilePath, string basePath)
        {
            var currentDir = Path.GetDirectoryName(currentFilePath);
            
            // 对于系统头文件，不尝试解析实际路径
            if (import.Contains('/') || import.Contains('\\'))
            {
                // 尝试在项目中查找头文件
                var possibleFiles = Directory.GetFiles(basePath, Path.GetFileName(import), SearchOption.AllDirectories);
                if (possibleFiles.Length > 0)
                {
                    return possibleFiles[0];
                }
            }
            else
            {
                // 查找当前目录和项目中的头文件
                var localPath = Path.Combine(currentDir, import);
                if (File.Exists(localPath))
                {
                    return localPath;
                }
                
                var possibleFiles = Directory.GetFiles(basePath, import, SearchOption.AllDirectories);
                if (possibleFiles.Length > 0)
                {
                    return possibleFiles[0];
                }
            }
            
            return null;
        }

        public int GetFunctionLineNumber(string fileContent, string functionName)
        {
            var lines = fileContent.Split('\n');
            var funcRegex = new Regex($@"(?:(?:[a-zA-Z0-9_\*&\s:<>,]+)\s+)?{functionName}\s*\(");
            
            for (int i = 0; i < lines.Length; i++)
            {
                if (funcRegex.IsMatch(lines[i]))
                {
                    return i + 1;
                }
            }
            
            return 0;
        }
    }
}