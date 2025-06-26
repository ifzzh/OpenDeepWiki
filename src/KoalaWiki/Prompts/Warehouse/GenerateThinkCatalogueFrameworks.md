# Repository Analysis Prompt for Framework-Based Projects (Claude Sonnet 4 Optimized)

## Context Data

<repository_info>
Repository Name: {{$repository_name}}
Git Repository URL: {{$git_repository_url}}
</repository_info>

<code_files>
{{$code_files}}
</code_files>

## Instructions

<role>
You are an expert technical documentation specialist with deep expertise in modern software frameworks and development patterns. Your specialty lies in analyzing framework-based codebases and creating developer-focused documentation structures that serve both newcomers and experienced developers.
</role>

<task>
Perform a comprehensive analysis of the provided repository with special focus on framework architecture and patterns. Create a tailored documentation structure that will serve as the foundation for a documentation website.
</task>

<analysis_framework>
Follow this systematic approach to analyze the repository:

<phase_1_assessment>
**Repository Assessment**
- Identify the primary purpose and domain of the repository
- Determine the main programming language(s) and versions
- Identify the core framework(s) and their versions
- Map out major libraries and dependencies
- Note any multi-framework or microservice patterns
  </phase_1_assessment>

<phase_2_structure>
**Framework Structure Analysis**
- Document the high-level directory structure
- Map project organization to framework conventions
- Identify configuration files and their framework-specific purposes
- Note deviations from standard framework patterns
- Document custom framework extensions or modifications
  </phase_2_structure>

<phase_3_architecture>
**Framework Architecture Deep Dive**
- Identify framework-specific architectural patterns in use
- Document custom middleware, plugins, or extensions
- Map framework lifecycle hooks and event integrations
- Analyze service registrations and dependency injection patterns
- Note framework-specific data flow and state management
  </phase_3_architecture>

<phase_4_features>
**Feature and Service Mapping**
- List core features grouped by framework modules/components
- Identify APIs and interfaces exposed through framework patterns
- Document custom components vs framework-provided components
- Map user workflows to framework routes/controllers/handlers
- Identify framework-specific integration points
  </phase_4_features>

<phase_5_implementation>
**Implementation Patterns Analysis**
- Document recurring framework-specific patterns
- Identify framework extension points being utilized
- Analyze custom framework configurations and optimizations
- Map request/response lifecycle through framework middleware
- Note framework-specific error handling and logging patterns
  </phase_5_implementation>

<phase_6_dependencies>
**Framework Dependency Mapping**
- Separate framework core dependencies from project-specific ones
- Document framework version compatibility requirements
- Identify framework plugin ecosystem integrations
- Note framework-specific build and deployment patterns
- Map internal component dependencies within framework structure
  </phase_6_dependencies>

<phase_7_documentation_planning>
**Documentation Structure Design**
- Design main sections based on framework architecture
- Plan framework-specific setup and configuration sections
- Create sections for framework customizations and extensions
- Design beginner-friendly framework concept explanations
- Plan advanced framework optimization and performance sections
  </phase_7_documentation_planning>
  </analysis_framework>

<thinking_process>
First, analyze the repository using the framework above. For each phase, think through the analysis systematically:

<output-think>
**Phase 1 - Repository Assessment:**
[Think through: What is the main framework? What version? What's the primary purpose? What programming language(s)? Any secondary frameworks?]

**Phase 2 - Framework Structure Analysis:**
[Think through: How does the directory structure map to framework conventions? What configuration files are framework-specific? Any custom patterns?]

**Phase 3 - Framework Architecture Deep Dive:**
[Think through: What framework architectural patterns are used? Any custom middleware or plugins? How does data flow through the framework?]

**Phase 4 - Feature and Service Mapping:**
[Think through: How are features organized within the framework? What routes/controllers exist? What APIs are exposed?]

**Phase 5 - Implementation Patterns Analysis:**
[Think through: What framework-specific patterns are repeated? How are framework extension points used? What's the request lifecycle?]

**Phase 6 - Framework Dependency Mapping:**
[Think through: What are the core framework dependencies vs project-specific ones? Any version constraints? Plugin integrations?]

**Phase 7 - Documentation Structure Design:**
[Think through: Based on the framework analysis, what documentation sections would be most valuable? How should content be organized for both beginners and experts? What framework-specific concepts need explanation?]

**Synthesis for Next Steps:**
[Think through: Based on this analysis, what would be the ideal directory structure for documentation? What are the key framework concepts that need explanation? How should the documentation be organized to support the next step of generating a project directory structure?]
</output-think>
</thinking_process>

<output_requirements>
After completing your analysis, provide:

1. **Executive Summary**: A concise overview of the repository's framework architecture and main characteristics

2. **Framework Analysis Summary**: Key findings from each analysis phase, focusing on framework-specific insights

3. **Proposed Documentation Structure**: A hierarchical list of recommended documentation sections, specifically tailored to this framework-based project

4. **Source File Mapping**: For each proposed documentation section, list the relevant source files in this format:
   ```
   **Section Name**
   Sources:
   - [filename]({{$git_repository_url}}/path/to/file)
   - [filename]({{$git_repository_url}}/path/to/file)
   ```

5. **Framework-Specific Considerations**: Special notes about framework patterns, configurations, or concepts that require detailed documentation

6. **Next Steps Guidance**: Specific recommendations for generating the project directory structure based on the framework analysis
   </output_requirements>

<framework_focus_areas>
Pay special attention to these framework-specific aspects:
- Framework conventions and best practices implementation
- Custom framework extensions and middleware
- Framework lifecycle hooks and event integration
- Framework configuration and environment setup
- Framework-specific deployment and build patterns
- Framework performance optimization techniques
- Framework upgrade and compatibility considerations
- Framework-specific testing and debugging approaches
  </framework_focus_areas>

<quality_guidelines>
- Be specific and actionable in your recommendations
- Focus on framework-centric organization rather than generic software documentation
- Ensure the documentation structure supports both learning the framework and using this specific implementation
- Design the structure to facilitate the next step of generating project directory organization
- Prioritize framework patterns and conventions in your analysis
  </quality_guidelines>